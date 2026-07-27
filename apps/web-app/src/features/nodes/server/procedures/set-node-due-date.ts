import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { dueDateSchema } from "@/features/nodes/model/due-date.schema";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";

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
					recurrence: nodes.recurrence,
				})
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!before) throw errors.NOT_FOUND();
			const recurrence =
				input.dueDate && before.recurrence
					? {
							...before.recurrence,
							anchorDay: Number(input.dueDate.slice(8, 10)),
						}
					: null;
			if (
				before.dueDate === input.dueDate &&
				JSON.stringify(before.recurrence) === JSON.stringify(recurrence)
			)
				return;
			const history = await createHistoryRecorder(transaction, userId);
			await transaction
				.update(nodes)
				.set({ dueDate: input.dueDate, recurrence })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "due_date_changed",
					label: historyNodeLabel(before.content),
					before: before.dueDate,
					after: input.dueDate,
					beforeRecurrence: before.recurrence,
					afterRecurrence: recurrence,
				},
			});
		});
	});
