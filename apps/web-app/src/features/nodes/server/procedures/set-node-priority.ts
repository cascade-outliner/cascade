import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { prioritySchema } from "@/features/nodes/model/priority.schema";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import { assertNodeCapabilityEnabled } from "@/features/settings/server/node-capability-access";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";

export const setNodePriority = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(
		z.object({
			id: z.string(),
			priority: prioritySchema.nullable(),
		}),
	)
	.handler(async ({ input, context, errors }) => {
		await assertNodeCapabilityEnabled(context.user.id, "priority");
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
			const [before] = await transaction
				.select({
					id: nodes.id,
					content: nodes.content,
					priority: nodes.priority,
				})
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!before) throw errors.NOT_FOUND();
			if (before.priority === input.priority) return;

			const history = await createHistoryRecorder(transaction, userId);
			await transaction
				.update(nodes)
				.set({ priority: input.priority })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "priority_changed",
					label: historyNodeLabel(before.content),
					before: before.priority,
					after: input.priority,
				},
			});
		});
	});
