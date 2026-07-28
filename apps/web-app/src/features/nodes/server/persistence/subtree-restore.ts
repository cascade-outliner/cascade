import { and, eq, inArray, sql } from "drizzle-orm";
import { nodeSearchText } from "../../model/node-search-text";
import type { RestoreNodeInput } from "../../model/subtree-snapshot.schema";
import { chunk, DUPLICATE_BATCH_SIZE } from "./batch-inserts";
import { nodes, nodeTags, tags } from "./node-tables";
import {
	type NodeTransaction,
	orderAtTarget,
	type SiblingTarget,
	siblingScope,
} from "./sibling-order";

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
				searchText: nodeSearchText(node.content),
				type: node.type,
				metadata: node.metadata,
				expanded: node.expanded,
				order: node.order,
				dueDate: node.dueDate,
				recurrence: node.recurrence,
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
		searchText: nodeSearchText(root.content),
		type: root.type,
		metadata: root.metadata,
		expanded: root.expanded,
		order,
		dueDate: root.dueDate,
		recurrence: root.recurrence,
	});
	await insertDescendants(transaction, userId, descendants);
	await restoreTags(transaction, userId, [root, ...descendants]);
}

export type RestorePlacement = "exact" | "fallback-root" | "fallback-append";

export type RestoreSnapshotOutcome =
	| {
			ok: true;
			placement: RestorePlacement;
			parentId: string | null;
			order: string;
	  }
	| { ok: false; reason: "ID_COLLISION"; nodeIds: string[] };

/**
 * Resolves where a captured subtree snapshot should land and inserts it —
 * the shared logic behind every restore entry point (`restore-node.ts`'s
 * direct restore, deletion receipts, and premium tree-history's
 * `subtree_deleted` restore), so all three treat missing placement and id
 * collisions identically instead of each reimplementing it. See "Missing
 * parent/anchor and ID collisions" in
 * docs/research/535-node-deletion-lifecycle.md.
 *
 * Falls back to the tree root if `parentId` no longer exists, then to
 * append if the anchor sibling named by `target` no longer exists in
 * whichever parent scope was actually used — reporting which fallback (if
 * any) applied, rather than silently repositioning or hard-failing an
 * otherwise-recoverable restore.
 */
export async function restoreSnapshotWithFallback(
	transaction: NodeTransaction,
	params: {
		userId: string;
		parentId: string | null;
		target: SiblingTarget;
		root: RootSnapshot;
		descendants: DescendantSnapshot[];
	},
): Promise<RestoreSnapshotOutcome> {
	const nodeIds = [params.root.id, ...params.descendants.map((d) => d.id)];
	const collisions = await transaction
		.select({ id: nodes.id })
		.from(nodes)
		.where(inArray(nodes.id, nodeIds));
	if (collisions.length > 0) {
		return {
			ok: false,
			reason: "ID_COLLISION",
			nodeIds: collisions.map((c) => c.id),
		};
	}

	let parentId = params.parentId;
	let placement: RestorePlacement = "exact";
	if (parentId !== null) {
		const [parent] = await transaction
			.select({ id: nodes.id })
			.from(nodes)
			.where(and(eq(nodes.id, parentId), eq(nodes.userId, params.userId)))
			.limit(1);
		if (!parent) {
			parentId = null;
			placement = "fallback-root";
		}
	}

	let target: SiblingTarget =
		placement === "fallback-root" ? { position: "append" } : params.target;
	let order = await orderAtTarget(
		transaction,
		siblingScope(params.userId, parentId),
		target,
	);
	if (order === undefined) {
		target = { position: "append" };
		order = (await orderAtTarget(
			transaction,
			siblingScope(params.userId, parentId),
			target,
		)) as string;
		if (placement === "exact") placement = "fallback-append";
	}

	await restoreSubtree(transaction, {
		userId: params.userId,
		parentId,
		order,
		root: params.root,
		descendants: params.descendants,
	});
	return { ok: true, placement, parentId, order };
}
