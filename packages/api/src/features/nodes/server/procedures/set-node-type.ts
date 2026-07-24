import { typedMetadataSchema } from "@cascade/outliner/node-types";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "../../../tree-history/server/history-persistence";
import { nodes } from "../persistence/node-tables";

export const setNodeType = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string() }).and(typedMetadataSchema))
	.handler(async ({ input, context, errors }) => {
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
			const [before] = await transaction
				.select({
					id: nodes.id,
					content: nodes.content,
					type: nodes.type,
					metadata: nodes.metadata,
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
				.set({ type: input.type, metadata: input.metadata })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "type_changed",
					label: historyNodeLabel(before.content),
					before: { type: before.type, metadata: before.metadata },
					after: { type: input.type, metadata: input.metadata },
				},
			});
		});
	});
