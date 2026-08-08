import { nextRecurringDueDate } from "@cascade/outliner/recurrence";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { dueDateSchema } from "@/features/nodes/model/due-date.schema";
import { assertNodeCapabilityEnabled } from "@/features/settings/server/node-capability-access";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";
import { nodes } from "../persistence/node-tables";

export const setTaskCompleted = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Task not found" },
	})
	.input(
		z.object({
			id: z.string(),
			completed: z.boolean(),
			today: dueDateSchema,
			expectedDueDate: dueDateSchema.nullable(),
		}),
	)
	.handler(async ({ input, context, errors }) => {
		await assertNodeCapabilityEnabled(context.user.id, "task");
		const userId = context.user.id;
		return db.transaction(async (transaction) => {
			const [before] = await transaction
				.select({
					content: nodes.content,
					type: nodes.type,
					metadata: nodes.metadata,
					dueDate: nodes.dueDate,
					recurrence: nodes.recurrence,
				})
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (before?.type !== "task") throw errors.NOT_FOUND();

			if (input.completed && before.recurrence && before.dueDate) {
				if (input.expectedDueDate !== before.dueDate) {
					return { advanced: false, nextDueDate: before.dueDate };
				}
				const nextDueDate = nextRecurringDueDate(
					before.dueDate,
					before.recurrence,
					input.today,
				);
				const metadata = { completed: false };
				const history = await createHistoryRecorder(transaction, userId);
				await transaction
					.update(nodes)
					.set({ dueDate: nextDueDate, metadata })
					.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
				await history.record({
					nodeId: input.id,
					payload: {
						kind: "recurring_task_completed",
						label: historyNodeLabel(before.content),
						before: { dueDate: before.dueDate, metadata: before.metadata },
						after: { dueDate: nextDueDate, metadata },
					},
				});
				return { advanced: true, nextDueDate };
			}

			const metadata = { completed: input.completed };
			if (JSON.stringify(before.metadata) === JSON.stringify(metadata)) {
				return { advanced: false, nextDueDate: before.dueDate };
			}
			const history = await createHistoryRecorder(transaction, userId);
			await transaction
				.update(nodes)
				.set({ metadata })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "type_changed",
					label: historyNodeLabel(before.content),
					before: { type: before.type, metadata: before.metadata },
					after: { type: before.type, metadata },
				},
			});
			return { advanced: false, nextDueDate: before.dueDate };
		});
	});
