import { typedMetadataSchema } from "@cascade/outliner/node-types";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assertNodeCapabilityEnabled } from "@/features/settings/server/node-capability-access";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";
import { nodes } from "../persistence/node-tables";

export const setNodeType = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string() }).and(typedMetadataSchema))
	.handler(async ({ input, context, errors }) => {
		if (input.type === "task") {
			await assertNodeCapabilityEnabled(context.user.id, "task");
		}
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
			const [before] = await transaction
				.select({
					id: nodes.id,
					content: nodes.content,
					type: nodes.type,
					metadata: nodes.metadata,
					recurrence: nodes.recurrence,
				})
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!before) throw errors.NOT_FOUND();
			if (
				before.type === input.type &&
				JSON.stringify(before.metadata) === JSON.stringify(input.metadata)
			)
				return;
			const history = await createHistoryRecorder(transaction, userId);
			await transaction
				.update(nodes)
				.set({
					type: input.type,
					metadata: input.metadata,
					recurrence: input.type === "task" ? before.recurrence : null,
				})
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "type_changed",
					label: historyNodeLabel(before.content),
					after: {
						type: input.type,
						metadata: input.metadata,
						recurrence: input.type === "task" ? before.recurrence : null,
					},
					before: {
						type: before.type,
						metadata: before.metadata,
						recurrence: before.recurrence,
					},
				},
			});
		});
	});
