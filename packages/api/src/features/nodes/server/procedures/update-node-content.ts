import { and, eq } from "drizzle-orm";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "../../../tree-history/server/history-persistence";
import { updateNodeContentInputSchema } from "../../model/node-content.schema";
import { nodes } from "../persistence/node-tables";

export const updateNodeContent = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(updateNodeContentInputSchema)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
			const [before] = await transaction
				.select({ id: nodes.id, content: nodes.content })
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!before) throw errors.NOT_FOUND();
			if (JSON.stringify(before.content) === JSON.stringify(input.content))
				return;

			const history = await createHistoryRecorder(transaction, userId);
			await transaction
				.update(nodes)
				.set({ content: input.content })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "content_changed",
					label: historyNodeLabel(input.content ?? before.content),
					before: before.content,
					after: input.content,
				},
			});
		});
	});
