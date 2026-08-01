import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { iconSchema } from "@/features/nodes/model/icon.schema";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";

export const setNodeIcon = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string(), icon: iconSchema.nullable() }))
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
			const [before] = await transaction
				.select({ id: nodes.id, content: nodes.content, icon: nodes.icon })
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!before) throw errors.NOT_FOUND();
			if (before.icon === input.icon) return;
			const history = await createHistoryRecorder(transaction, userId);
			await transaction
				.update(nodes)
				.set({ icon: input.icon })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "icon_changed",
					label: historyNodeLabel(before.content),
					before: before.icon,
					after: input.icon,
				},
			});
		});
	});
