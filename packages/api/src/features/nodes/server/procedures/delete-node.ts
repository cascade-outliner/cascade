import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import {
	captureRestoreTarget,
	captureSubtree,
	createHistoryRecorder,
	historyNodeLabel,
} from "../../../tree-history/server/history-persistence";
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
			if (!root) return { childrenDeleted: 0 };

			const history = await createHistoryRecorder(transaction, userId);
			const snapshots = history.enabled
				? await captureSubtree(transaction, input.id, userId, "before")
				: [];
			const target = history.enabled
				? await captureRestoreTarget(
						transaction,
						userId,
						root.parentId,
						root.order,
					)
				: { position: "append" as const };

			const [result] = (await transaction.execute(sql`
				WITH RECURSIVE ${descendantsOf(input.id, userId)}
				DELETE FROM nodes WHERE id = ${input.id} AND user_id = ${userId}
				RETURNING (SELECT count(*) FROM descendants)::int AS count
			`)) as unknown as { count: number }[];

			await history.record({
				nodeId: input.id,
				payload: {
					kind: "subtree_deleted",
					label: historyNodeLabel(root.content),
					location: { parentId: root.parentId, target },
					count: snapshots.length || (result?.count ?? 0) + 1,
				},
				snapshots,
			});
			return { childrenDeleted: result?.count ?? 0 };
		});
	});
