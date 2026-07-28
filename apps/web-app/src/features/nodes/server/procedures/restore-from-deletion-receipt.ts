import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
	captureSubtree,
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";
import { consumeDeletionReceipt } from "../persistence/deletion-receipt-persistence";
import { nodeColumns } from "../persistence/node-columns";
import { nodes } from "../persistence/node-tables";
import { lockNodeOrdering } from "../persistence/sibling-order";

/**
 * The undo of `deleteNode`: consumes a `receiptId` returned by a prior
 * delete and reinserts its subtree with original ids intact. Unlike the
 * direct `nodes.restore` procedure, the caller supplies no snapshot data —
 * everything needed was captured atomically at delete time. See
 * docs/research/535-node-deletion-lifecycle.md.
 */
export const restoreFromDeletionReceipt = authed
	.errors({
		RECEIPT_NOT_FOUND: { status: 404, message: "Deletion receipt not found" },
		RECEIPT_EXPIRED: { status: 410, message: "Deletion receipt has expired" },
		RECEIPT_CONSUMED: {
			status: 409,
			message: "Deletion receipt was already restored",
		},
		ID_COLLISION: {
			status: 409,
			message: "Restore target ids already exist",
		},
	})
	.input(z.object({ receiptId: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		return db.transaction(async (transaction) => {
			await lockNodeOrdering(transaction, userId);
			const result = await consumeDeletionReceipt(
				transaction,
				userId,
				input.receiptId,
			);
			if (!result.ok) {
				switch (result.reason) {
					case "RECEIPT_NOT_FOUND":
						throw errors.RECEIPT_NOT_FOUND();
					case "RECEIPT_EXPIRED":
						throw errors.RECEIPT_EXPIRED();
					case "RECEIPT_CONSUMED":
						throw errors.RECEIPT_CONSUMED();
					case "ID_COLLISION":
						throw errors.ID_COLLISION();
				}
			}

			const [created] = await transaction
				.select(nodeColumns(userId))
				.from(nodes)
				.where(eq(nodes.id, result.rootNodeId))
				.limit(1);

			const history = await createHistoryRecorder(transaction, userId);
			if (created) {
				await history.record({
					nodeId: created.id,
					payload: {
						kind: "subtree_restored",
						label: historyNodeLabel(created.content),
						count: result.descendantCount + 1,
					},
					snapshots: history.enabled
						? await captureSubtree(transaction, created.id, userId, "after")
						: [],
				});
			}

			return { node: created, placement: result.placement };
		});
	});
