import { normalizeTags } from "@cascade/outliner/node-tags";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "../../../tree-history/server/history-persistence";
import { setNodeTagsInputSchema } from "../../model/tag-name.schema";
import { nodes, nodeTags, tags } from "../persistence/node-tables";

export const setNodeTags = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(setNodeTagsInputSchema)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		const names = normalizeTags(input.tags).sort((a, b) => a.localeCompare(b));

		await db.transaction(async (transaction) => {
			const [node] = await transaction
				.select({ id: nodes.id, content: nodes.content })
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.limit(1);
			if (!node) throw errors.NOT_FOUND();
			const before = (
				await transaction
					.select({ name: tags.name })
					.from(nodeTags)
					.innerJoin(tags, eq(tags.id, nodeTags.tagId))
					.where(eq(nodeTags.nodeId, input.id))
					.orderBy(asc(tags.name))
			).map(({ name }) => name);
			if (
				before.length === names.length &&
				before.every((name) => names.includes(name))
			)
				return;
			const history = await createHistoryRecorder(transaction, userId);

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

			await transaction.delete(nodeTags).where(eq(nodeTags.nodeId, input.id));
			if (tagIds.length > 0) {
				await transaction
					.insert(nodeTags)
					.values(tagIds.map((tagId) => ({ nodeId: input.id, tagId })));
			}
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "tags_changed",
					label: historyNodeLabel(node.content),
					before,
					after: names,
				},
			});
		});
	});
