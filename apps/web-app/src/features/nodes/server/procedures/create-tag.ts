import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { createHistoryRecorder } from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";
import { createTagInputSchema } from "../../model/tag-name.schema";
import { tags } from "../persistence/node-tables";

export const createTag = authed
	.errors({
		CONFLICT: { status: 409, message: "A tag with this name already exists" },
	})
	.input(createTagInputSchema)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;

		await db.transaction(async (transaction) => {
			const [existing] = await transaction
				.select({ id: tags.id })
				.from(tags)
				.where(
					and(
						eq(tags.userId, userId),
						sql`lower(${tags.name}) = lower(${input.name})`,
					),
				)
				.limit(1);
			if (existing) throw errors.CONFLICT();

			await transaction.insert(tags).values({ userId, name: input.name });
			const history = await createHistoryRecorder(transaction, userId);
			await history.record({
				nodeId: null,
				payload: {
					kind: "tag_created",
					label: input.name,
					name: input.name,
				},
			});
		});
	});
