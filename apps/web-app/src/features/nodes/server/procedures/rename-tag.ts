import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { createHistoryRecorder } from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";
import { renameTagInputSchema } from "../../model/tag-name.schema";
import { nodeTags, tags } from "../persistence/node-tables";

export const renameTag = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Tag not found" },
		CONFLICT: { status: 409, message: "A tag with this name already exists" },
	})
	.input(renameTagInputSchema)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;

		await db.transaction(async (transaction) => {
			const [tag] = await transaction
				.select({ id: tags.id, name: tags.name })
				.from(tags)
				.where(and(eq(tags.userId, userId), eq(tags.name, input.name)))
				.for("update");
			if (!tag) throw errors.NOT_FOUND();
			if (tag.name === input.newName) return;

			const [conflict] = await transaction
				.select({ id: tags.id })
				.from(tags)
				.where(
					and(
						eq(tags.userId, userId),
						ne(tags.id, tag.id),
						sql`lower(${tags.name}) = lower(${input.newName})`,
					),
				)
				.limit(1);
			if (conflict) throw errors.CONFLICT();

			const nodeIds = (
				await transaction
					.select({ nodeId: nodeTags.nodeId })
					.from(nodeTags)
					.where(eq(nodeTags.tagId, tag.id))
			).map(({ nodeId }) => nodeId);
			const history = await createHistoryRecorder(transaction, userId);

			await transaction
				.update(tags)
				.set({ name: input.newName })
				.where(eq(tags.id, tag.id));
			await history.record({
				nodeId: null,
				payload: {
					kind: "tag_renamed",
					label: input.newName,
					before: tag.name,
					after: input.newName,
					nodeIds,
				},
			});
		});
	});
