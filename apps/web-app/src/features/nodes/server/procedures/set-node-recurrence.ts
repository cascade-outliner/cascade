import {
	type RecurrenceRule,
	recurrenceInputSchema,
} from "@cascade/outliner/recurrence";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";
import { nodes } from "../persistence/node-tables";

export const setNodeRecurrence = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
		INVALID_NODE: {
			status: 400,
			message: "Recurrence requires a task with a due date",
		},
	})
	.input(
		z.object({
			id: z.string(),
			recurrence: recurrenceInputSchema.nullable(),
		}),
	)
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
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
			if (!before) throw errors.NOT_FOUND();
			if (input.recurrence && (before.type !== "task" || !before.dueDate)) {
				throw errors.INVALID_NODE();
			}

			const recurrence: RecurrenceRule | null =
				input.recurrence && before.dueDate
					? {
							...input.recurrence,
							anchorDay: Number(before.dueDate.slice(8, 10)),
						}
					: null;
			const metadata =
				recurrence && before.type === "task"
					? { completed: false }
					: before.metadata;
			if (
				JSON.stringify(before.recurrence) === JSON.stringify(recurrence) &&
				JSON.stringify(before.metadata) === JSON.stringify(metadata)
			)
				return;

			const history = await createHistoryRecorder(transaction, userId);
			await transaction
				.update(nodes)
				.set({ recurrence, metadata })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "recurrence_changed",
					label: historyNodeLabel(before.content),
					before: {
						recurrence: before.recurrence,
						metadata: before.metadata,
					},
					after: { recurrence, metadata },
				},
			});
		});
	});
