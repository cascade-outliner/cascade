import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "../../../tree-history/server/history-persistence";
import { dueDateSchema } from "../../model/due-date.schema";
import { nodes } from "../persistence/node-tables";

export const setNodeDueDate = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string(), dueDate: dueDateSchema.nullable() }))
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
			const [before] = await transaction
				.select({
					id: nodes.id,
					content: nodes.content,
					dueDate: nodes.dueDate,
				})
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!before) throw errors.NOT_FOUND();
			if (before.dueDate === input.dueDate) return;
			const history = await createHistoryRecorder(transaction, userId);
			await transaction
				.update(nodes)
				.set({ dueDate: input.dueDate })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "due_date_changed",
					label: historyNodeLabel(before.content),
					before: before.dueDate,
					after: input.dueDate,
				},
			});
		});
	});
