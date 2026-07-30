import { normalizeTags } from "@cascade/outliner/node-tags";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/env";
import {
	nodes,
	nodeTags,
	tags,
} from "@/features/nodes/server/persistence/node-tables";
import {
	type NodeTransaction,
	orderAtTarget,
	siblingScope,
} from "@/features/nodes/server/persistence/sibling-order";
import {
	type HistoryRestoreTarget,
	RESTORABLE_HISTORY_KINDS,
	type TreeHistorySummary,
} from "../../model/tree-history.schema";

export type NodeRow = typeof nodes.$inferSelect;

// Mirrors the purge job's default retention (see purge-tree-history.ts) so
// read/restore visibility stays in sync with how long history is actually kept.
export const cutoff = () =>
	new Date(Date.now() - env.TREE_HISTORY_RETENTION_DAYS * 86_400_000);

export const cursorSchema = z.object({
	createdAt: z.string().datetime(),
	id: z.string(),
});

export function isEventCurrentlyRestorable(
	kind: TreeHistorySummary["kind"],
	nodeId: string | null,
	currentNodeId: string | null,
): boolean {
	if (!RESTORABLE_HISTORY_KINDS.has(kind)) return false;
	if (kind === "tag_deleted") return true;
	if (kind === "subtree_deleted") return currentNodeId === null;
	return nodeId !== null && currentNodeId !== null;
}

export async function existingParentOrRoot(
	transaction: NodeTransaction,
	userId: string,
	parentId: string | null,
): Promise<string | null> {
	if (parentId === null) return null;
	const [parent] = await transaction
		.select({ id: nodes.id })
		.from(nodes)
		.where(and(eq(nodes.id, parentId), eq(nodes.userId, userId)))
		.limit(1);
	return parent?.id ?? null;
}

export async function orderAtTargetOrAppend(
	transaction: NodeTransaction,
	userId: string,
	parentId: string | null,
	target: HistoryRestoreTarget,
): Promise<string> {
	return (
		(await orderAtTarget(
			transaction,
			siblingScope(userId, parentId),
			target,
		)) ??
		((await orderAtTarget(transaction, siblingScope(userId, parentId), {
			position: "append",
		})) as string)
	);
}

export async function setTags(
	transaction: NodeTransaction,
	userId: string,
	nodeId: string,
	namesInput: string[],
): Promise<string[]> {
	const names = normalizeTags(namesInput).sort((a, b) => a.localeCompare(b));
	const tagIds =
		names.length === 0
			? []
			: (
					await transaction
						.insert(tags)
						.values(names.map((name) => ({ userId, name })))
						.onConflictDoUpdate({
							target: [tags.userId, tags.name],
							set: { name: sql`excluded.name` },
						})
						.returning({ id: tags.id })
				).map(({ id }) => id);
	await transaction.delete(nodeTags).where(eq(nodeTags.nodeId, nodeId));
	if (tagIds.length > 0) {
		await transaction
			.insert(nodeTags)
			.values(tagIds.map((tagId) => ({ nodeId, tagId })));
	}
	return names;
}

export async function currentTags(
	transaction: NodeTransaction,
	nodeId: string,
): Promise<string[]> {
	return (
		await transaction
			.select({ name: tags.name })
			.from(nodeTags)
			.innerJoin(tags, eq(tags.id, nodeTags.tagId))
			.where(eq(nodeTags.nodeId, nodeId))
			.orderBy(tags.name)
	).map(({ name }) => name);
}
