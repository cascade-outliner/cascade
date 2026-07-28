import { and, eq } from "drizzle-orm";
import { env } from "@/env";
import type {
	RestoreNodeInput,
	RestoreTarget,
} from "../../model/subtree-snapshot.schema";
import {
	chunk,
	DUPLICATE_BATCH_SIZE,
	postgresBatchSize,
} from "./batch-inserts";
import {
	nodeDeletionReceiptSnapshots,
	nodeDeletionReceipts,
} from "./node-deletion-receipt-table";
import type { NodeTransaction } from "./sibling-order";
import {
	type CapturedSubtreeNode,
	captureRestoreTarget,
	captureSubtreeRows,
} from "./subtree-capture";
import {
	type RestorePlacement,
	restoreSnapshotWithFallback,
} from "./subtree-restore";

export interface DeletionReceiptCapture {
	receiptId: string;
	target: RestoreTarget;
	snapshots: CapturedSubtreeNode[];
}

/**
 * Captures `root`'s complete subtree and its restore target atomically
 * (same transaction as the caller's delete), unconditionally — free and
 * premium users alike, unlike premium tree history. Returns the captured
 * rows too, so `deleteNode` can reuse them for a premium `tree_history_*`
 * write instead of re-querying the same subtree.
 */
export async function captureDeletionReceipt(
	transaction: NodeTransaction,
	userId: string,
	root: { id: string; parentId: string | null; order: string },
): Promise<DeletionReceiptCapture> {
	const snapshots = await captureSubtreeRows(transaction, root.id, userId);
	const target = await captureRestoreTarget(
		transaction,
		userId,
		root.parentId,
		root.order,
	);

	const [receipt] = await transaction
		.insert(nodeDeletionReceipts)
		.values({
			userId,
			rootNodeId: root.id,
			parentId: root.parentId,
			target,
			expiresAt: new Date(
				Date.now() + env.NODE_DELETION_RECEIPT_TTL_MINUTES * 60_000,
			),
		})
		.returning({ id: nodeDeletionReceipts.id });
	if (!receipt) throw new Error("Failed to create deletion receipt");

	const snapshotValues = snapshots.map((node) => ({
		receiptId: receipt.id,
		nodeId: node.nodeId,
		parentId: node.parentId,
		content: node.content,
		type: node.type,
		metadata: node.metadata,
		expanded: node.expanded,
		order: node.order,
		dueDate: node.dueDate,
		recurrence: node.recurrence,
		tags: node.tags,
		depth: node.depth,
		isRoot: node.isRoot,
	}));
	const parametersPerSnapshot = Object.keys(snapshotValues[0] ?? {}).length;
	const snapshotBatchSize =
		parametersPerSnapshot > 0
			? Math.min(DUPLICATE_BATCH_SIZE, postgresBatchSize(parametersPerSnapshot))
			: DUPLICATE_BATCH_SIZE;
	for (const batch of chunk(snapshotValues, snapshotBatchSize)) {
		await transaction.insert(nodeDeletionReceiptSnapshots).values(batch);
	}

	return { receiptId: receipt.id, target, snapshots };
}

export type ConsumeDeletionReceiptResult =
	| {
			ok: true;
			rootNodeId: string;
			descendantCount: number;
			placement: RestorePlacement;
	  }
	| {
			ok: false;
			reason: "RECEIPT_NOT_FOUND" | "RECEIPT_EXPIRED" | "RECEIPT_CONSUMED";
	  }
	| { ok: false; reason: "ID_COLLISION"; nodeIds: string[] };

/**
 * Consumes a deletion receipt exactly once: validates it (scoped to
 * `userId`, unexpired, not already consumed), reinserts its captured
 * subtree via the same fallback/collision logic every restore path shares
 * (`restoreSnapshotWithFallback`), and marks it consumed so a second
 * consume attempt — a stale redo racing an earlier undo, for instance —
 * gets a stable `RECEIPT_CONSUMED` instead of silently double-restoring.
 */
export async function consumeDeletionReceipt(
	transaction: NodeTransaction,
	userId: string,
	receiptId: string,
): Promise<ConsumeDeletionReceiptResult> {
	const [receipt] = await transaction
		.select()
		.from(nodeDeletionReceipts)
		.where(
			and(
				eq(nodeDeletionReceipts.id, receiptId),
				eq(nodeDeletionReceipts.userId, userId),
			),
		)
		.for("update");
	if (!receipt) return { ok: false, reason: "RECEIPT_NOT_FOUND" };
	if (receipt.consumedAt) return { ok: false, reason: "RECEIPT_CONSUMED" };
	if (receipt.expiresAt.getTime() <= Date.now()) {
		return { ok: false, reason: "RECEIPT_EXPIRED" };
	}

	const snapshotRows = await transaction
		.select()
		.from(nodeDeletionReceiptSnapshots)
		.where(eq(nodeDeletionReceiptSnapshots.receiptId, receiptId))
		.orderBy(
			nodeDeletionReceiptSnapshots.depth,
			nodeDeletionReceiptSnapshots.order,
		);
	const root = snapshotRows.find((row) => row.isRoot);
	// Defensive: a receipt row always has at least its root snapshot: the
	// capture and the receipt insert share a transaction with the delete.
	if (!root) return { ok: false, reason: "RECEIPT_NOT_FOUND" };

	const toSnapshot = (row: (typeof snapshotRows)[number]) =>
		({
			id: row.nodeId,
			content: row.content as { root: unknown } | null,
			expanded: row.expanded,
			dueDate: row.dueDate,
			recurrence: row.recurrence,
			tags: row.tags,
			type: row.type,
			metadata: row.metadata,
		}) as RestoreNodeInput["root"];

	const outcome = await restoreSnapshotWithFallback(transaction, {
		userId,
		parentId: receipt.parentId,
		target: receipt.target,
		root: toSnapshot(root),
		descendants: snapshotRows
			.filter((row) => !row.isRoot)
			.map(
				(row) =>
					({
						...toSnapshot(row),
						parentId: row.parentId as string,
						order: row.order,
					}) as RestoreNodeInput["descendants"][number],
			),
	});
	if (!outcome.ok) return outcome;

	await transaction
		.update(nodeDeletionReceipts)
		.set({ consumedAt: new Date() })
		.where(eq(nodeDeletionReceipts.id, receiptId));

	return {
		ok: true,
		rootNodeId: root.nodeId,
		descendantCount: snapshotRows.length - 1,
		placement: outcome.placement,
	};
}
