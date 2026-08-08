import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { colorSchema } from "@/features/nodes/model/color.schema";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import { assertNodeCapabilityEnabled } from "@/features/settings/server/node-capability-access";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";

export const setNodeColor = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string(), color: colorSchema.nullable() }))
	.handler(async ({ input, context, errors }) => {
		await assertNodeCapabilityEnabled(context.user.id, "color");
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
			const [before] = await transaction
				.select({ id: nodes.id, content: nodes.content, color: nodes.color })
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!before) throw errors.NOT_FOUND();
			if (before.color === input.color) return;
			const history = await createHistoryRecorder(transaction, userId);
			await transaction
				.update(nodes)
				.set({ color: input.color })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "color_changed",
					label: historyNodeLabel(before.content),
					before: before.color ?? null,
					after: input.color,
				},
			});
		});
	});
