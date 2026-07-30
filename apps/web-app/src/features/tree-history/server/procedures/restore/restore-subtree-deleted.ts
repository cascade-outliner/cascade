import { and, eq, inArray } from "drizzle-orm";
import type { RestoreNodeInput } from "@/features/nodes/model/subtree-snapshot.schema";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import { restoreSubtree } from "@/features/nodes/server/persistence/subtree-restore";
import type {
	TreeHistoryPayload,
	TreeHistoryRestoreResult,
} from "../../../model/tree-history.schema";
import {
	captureSubtree,
	type HistoryRecorder,
} from "../../history-persistence";
import { treeHistorySnapshots } from "../../tree-history-table";
import { existingParentOrRoot, orderAtTargetOrAppend } from "../shared";

export async function restoreSubtreeDeleted(
	transaction: NodeTransaction,
	userId: string,
	payload: Extract<TreeHistoryPayload, { kind: "subtree_deleted" }>,
	sourceEventId: string,
	history: HistoryRecorder,
	throwNotRestorable: () => never,
): Promise<TreeHistoryRestoreResult> {
	const snapshotRows = await transaction
		.select()
		.from(treeHistorySnapshots)
		.where(
			and(
				eq(treeHistorySnapshots.eventId, sourceEventId),
				eq(treeHistorySnapshots.phase, "before"),
			),
		)
		.orderBy(treeHistorySnapshots.depth, treeHistorySnapshots.order);
	const root = snapshotRows.find((row) => row.isRoot);
	if (!root || snapshotRows.length === 0) throwNotRestorable();
	const collisions = await transaction
		.select({ id: nodes.id })
		.from(nodes)
		.where(
			inArray(
				nodes.id,
				snapshotRows.map(({ nodeId }) => nodeId),
			),
		)
		.limit(1);
	if (collisions.length > 0) throwNotRestorable();

	const parentId = await existingParentOrRoot(
		transaction,
		userId,
		payload.location.parentId,
	);
	const target =
		parentId === payload.location.parentId
			? payload.location.target
			: ({ position: "append" } as const);
	const order = await orderAtTargetOrAppend(
		transaction,
		userId,
		parentId,
		target,
	);
	await restoreSubtree(transaction, {
		userId,
		parentId,
		order,
		root: {
			id: root.nodeId,
			content: root.content,
			type: root.type,
			metadata: root.metadata,
			expanded: root.expanded,
			dueDate: root.dueDate,
			recurrence: root.recurrence,
			tags: root.tags,
		} as RestoreNodeInput["root"],
		descendants: snapshotRows
			.filter((row) => !row.isRoot)
			.map((row) => ({
				id: row.nodeId,
				parentId: row.parentId as string,
				order: row.order,
				content: row.content,
				type: row.type,
				metadata: row.metadata,
				expanded: row.expanded,
				dueDate: row.dueDate,
				recurrence: row.recurrence,
				tags: row.tags,
			})) as RestoreNodeInput["descendants"],
	});
	const after = await captureSubtree(transaction, root.nodeId, userId, "after");
	const eventId = await history.record({
		nodeId: root.nodeId,
		payload: {
			kind: "subtree_restored",
			label: payload.label,
			count: after.length,
		},
		snapshots: after,
		restoredFromEventId: sourceEventId,
	});
	return {
		eventId: eventId as string,
		affectedNodeIds: after.map((node) => node.nodeId),
	};
}
