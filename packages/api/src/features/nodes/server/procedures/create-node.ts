import { normalizeTags } from "@cascade/outliner/node-tags";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import {
	captureSubtree,
	createHistoryRecorder,
	historyNodeLabel,
} from "../../../tree-history/server/history-persistence";
import { dueDateSchema } from "../../model/due-date.schema";
import { tagsArraySchema } from "../../model/tag-name.schema";
import { nodeColumns } from "../persistence/node-columns";
import { nodes, nodeTags, tags } from "../persistence/node-tables";
import {
	lockNodeOrdering,
	orderAtTarget,
	siblingScope,
} from "../persistence/sibling-order";

export const createNode = authed
	.errors({
		NOT_FOUND: {
			status: 404,
			message: "Anchor node is not a child of the requested parent",
		},
	})
	.input(
		z.object({
			parentId: z.string().nullable(),
			afterId: z.string().nullable().optional(),
			dueDate: dueDateSchema.nullable().optional(),
			tags: tagsArraySchema.optional(),
		}),
	)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		return db.transaction(async (transaction) => {
			await lockNodeOrdering(transaction, userId);
			const history = await createHistoryRecorder(transaction, userId);
			const target = input.afterId
				? { position: "after" as const, targetId: input.afterId }
				: { position: "append" as const };
			const order = await orderAtTarget(
				transaction,
				siblingScope(userId, input.parentId),
				target,
				false,
			);
			if (order === undefined) throw errors.NOT_FOUND();

			const [inserted] = await transaction
				.insert(nodes)
				.values({
					parentId: input.parentId,
					order,
					userId,
					dueDate: input.dueDate ?? null,
				})
				.returning({ id: nodes.id });

			const tagNames = normalizeTags(input.tags ?? []);
			if (tagNames.length > 0) {
				const tagIds = (
					await transaction
						.insert(tags)
						.values(tagNames.map((name) => ({ userId, name })))
						.onConflictDoUpdate({
							target: [tags.userId, tags.name],
							set: { name: sql`excluded.name` },
						})
						.returning({ id: tags.id })
				).map(({ id }) => id);
				await transaction
					.insert(nodeTags)
					.values(tagIds.map((tagId) => ({ nodeId: inserted.id, tagId })));
			}

			const [created] = await transaction
				.select(nodeColumns(userId))
				.from(nodes)
				.where(eq(nodes.id, inserted.id))
				.limit(1);

			if (created) {
				await history.record({
					nodeId: created.id,
					payload: {
						kind: "node_created",
						label: historyNodeLabel(created.content),
					},
					snapshots: history.enabled
						? await captureSubtree(transaction, created.id, userId, "after")
						: [],
				});
			}
			return created;
		});
	});
