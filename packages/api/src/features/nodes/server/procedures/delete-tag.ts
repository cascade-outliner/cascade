import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import { createHistoryRecorder } from "../../../tree-history/server/history-persistence";
import { nodeTags, tags } from "../persistence/node-tables";

/** Deletes a tag outright, cascading to every node association. */
export const deleteTag = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Tag not found" },
	})
	.input(z.object({ name: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
			const [tag] = await transaction
				.select({ id: tags.id })
				.from(tags)
				.where(and(eq(tags.userId, userId), eq(tags.name, input.name)))
				.for("update");
			if (!tag) throw errors.NOT_FOUND();
			const nodeIds = (
				await transaction
					.select({ nodeId: nodeTags.nodeId })
					.from(nodeTags)
					.where(eq(nodeTags.tagId, tag.id))
			).map(({ nodeId }) => nodeId);
			const history = await createHistoryRecorder(transaction, userId);
			await transaction.delete(tags).where(eq(tags.id, tag.id));
			await history.record({
				nodeId: null,
				payload: {
					kind: "tag_deleted",
					label: input.name,
					name: input.name,
					nodeIds,
				},
			});
		});
	});
