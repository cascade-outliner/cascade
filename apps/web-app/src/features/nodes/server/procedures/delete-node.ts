import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";
import { captureDeletionReceipt } from "../persistence/deletion-receipt-persistence";
import { nodes } from "../persistence/node-tables";
import { lockNodeOrdering } from "../persistence/sibling-order";
import { descendantsOf } from "../persistence/tree-cte";

export const deleteNode = authed
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const userId = context.user.id;
		return db.transaction(async (transaction) => {
			await lockNodeOrdering(transaction, userId);
			const [root] = await transaction
				.select({
					id: nodes.id,
					parentId: nodes.parentId,
					order: nodes.order,
					content: nodes.content,
				})
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!root) return { childrenDeleted: 0, receiptId: null };

			// Captured atomically, in this same transaction, for every user —
			// not just premium seats — so undo never depends on a separate,
			// non-transactional client-side subtree fetch. See
			// docs/research/535-node-deletion-lifecycle.md.
			const { receiptId, snapshots, target } = await captureDeletionReceipt(
				transaction,
				userId,
				root,
			);

			const [result] = (await transaction.execute(sql`
				WITH RECURSIVE ${descendantsOf(input.id, userId)}
				DELETE FROM nodes WHERE id = ${input.id} AND user_id = ${userId}
				RETURNING (SELECT count(*) FROM descendants)::int AS count
			`)) as unknown as { count: number }[];

			// Premium's durable history reuses the receipt's already-captured
			// rows instead of re-querying the same subtree; `record` no-ops
			// (and never touches `snapshots`) for non-premium users.
			const history = await createHistoryRecorder(transaction, userId);
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "subtree_deleted",
					label: historyNodeLabel(root.content),
					location: { parentId: root.parentId, target },
					count: snapshots.length,
				},
				snapshots: snapshots.map((node) => ({
					...node,
					phase: "before" as const,
				})),
			});
			return { childrenDeleted: result?.count ?? 0, receiptId };
		});
	});
