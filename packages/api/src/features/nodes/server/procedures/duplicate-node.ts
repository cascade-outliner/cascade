import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import {
	captureSubtree,
	createHistoryRecorder,
	historyNodeLabel,
} from "../../../tree-history/server/history-persistence";
import { nodeColumns } from "../persistence/node-columns";
import { nodes } from "../persistence/node-tables";
import {
	lockNodeOrdering,
	orderAfter,
	siblingScope,
} from "../persistence/sibling-order";
import {
	insertSubtreeCopy,
	prepareSubtreeCopy,
} from "../persistence/subtree-copy";

/**
 * Copies a node and its full subtree (content, tags, due date, type,
 * metadata, expanded state), inserting the copy as a sibling immediately
 * after the original. Descendants keep their original `order` values since
 * they move under freshly generated parent ids, so relative sibling order
 * within the copy is preserved for free; only the new root needs a
 * freshly computed order, between the original and its next sibling.
 */
export const duplicateNode = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;

		return await db.transaction(async (tx) => {
			await lockNodeOrdering(tx, userId);
			const history = await createHistoryRecorder(tx, userId);

			const [original] = await tx
				.select({ parentId: nodes.parentId, order: nodes.order })
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!original) throw errors.NOT_FOUND();

			const prepared = await prepareSubtreeCopy(tx, input.id, userId);
			const newOrder = await orderAfter(
				tx,
				siblingScope(userId, original.parentId),
				original.order,
			);
			await insertSubtreeCopy(tx, {
				prepared,
				sourceId: input.id,
				userId,
				parentId: original.parentId,
				rootOrder: newOrder,
			});

			const [created] = await tx
				.select(nodeColumns(userId))
				.from(nodes)
				.where(eq(nodes.id, prepared.newRootId))
				.limit(1);
			if (created) {
				await history.record({
					nodeId: created.id,
					payload: {
						kind: "subtree_duplicated",
						label: historyNodeLabel(created.content),
						sourceNodeId: input.id,
						count: prepared.rows.length,
					},
					snapshots: history.enabled
						? await captureSubtree(tx, created.id, userId, "after")
						: [],
				});
			}
			return created;
		});
	});
