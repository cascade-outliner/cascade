import { sql } from "drizzle-orm";
import type { RestoreNodeInput } from "../../model/subtree-snapshot.schema";
import { chunk, DUPLICATE_BATCH_SIZE } from "./batch-inserts";
import { nodes, nodeTags, tags } from "./node-tables";
import type { NodeTransaction } from "./sibling-order";

type RootSnapshot = RestoreNodeInput["root"];
type DescendantSnapshot = RestoreNodeInput["descendants"][number];

async function insertDescendants(
	transaction: NodeTransaction,
	userId: string,
	descendants: DescendantSnapshot[],
): Promise<void> {
	for (const batch of chunk(descendants, DUPLICATE_BATCH_SIZE)) {
		await transaction.insert(nodes).values(
			batch.map((node) => ({
				id: node.id,
				parentId: node.parentId,
				userId,
				content: node.content,
				type: node.type,
				metadata: node.metadata,
				expanded: node.expanded,
				order: node.order,
				dueDate: node.dueDate,
			})),
		);
	}
}

async function restoreTags(
	transaction: NodeTransaction,
	userId: string,
	snapshots: Array<RootSnapshot | DescendantSnapshot>,
): Promise<void> {
	const taggedNodes = snapshots.filter((node) => node.tags.length > 0);
	if (taggedNodes.length === 0) return;

	const tagNames = [...new Set(taggedNodes.flatMap((node) => node.tags))];
	const tagRows = await transaction
		.insert(tags)
		.values(tagNames.map((name) => ({ userId, name })))
		.onConflictDoUpdate({
			target: [tags.userId, tags.name],
			set: { name: sql`excluded.name` },
		})
		.returning({ id: tags.id, name: tags.name });
	const tagIdByName = new Map(tagRows.map((tag) => [tag.name, tag.id]));
	const nodeTagValues = taggedNodes.flatMap((node) =>
		node.tags.map((name) => ({
			nodeId: node.id,
			tagId: tagIdByName.get(name) as string,
		})),
	);

	for (const batch of chunk(nodeTagValues, DUPLICATE_BATCH_SIZE)) {
		await transaction.insert(nodeTags).values(batch);
	}
}

export async function restoreSubtree(
	transaction: NodeTransaction,
	{
		userId,
		parentId,
		order,
		root,
		descendants,
	}: {
		userId: string;
		parentId: string | null;
		order: string;
		root: RootSnapshot;
		descendants: DescendantSnapshot[];
	},
): Promise<void> {
	await transaction.insert(nodes).values({
		id: root.id,
		parentId,
		userId,
		content: root.content,
		type: root.type,
		metadata: root.metadata,
		expanded: root.expanded,
		order,
		dueDate: root.dueDate,
	});
	await insertDescendants(transaction, userId, descendants);
	await restoreTags(transaction, userId, [root, ...descendants]);
}
