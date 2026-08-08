import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { setNodeStatusInputSchema } from "@/features/nodes/model/status.schema";
import {
	nodes,
	statuses,
} from "@/features/nodes/server/persistence/node-tables";
import { assertNodeCapabilityEnabled } from "@/features/settings/server/node-capability-access";
import {
	createHistoryRecorder,
	historyNodeLabel,
} from "@/features/tree-history/server/history-persistence";
import { authed } from "@/orpc/context";

export const setNodeStatus = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
		STATUS_NOT_FOUND: { status: 404, message: "Status not found" },
	})
	.input(setNodeStatusInputSchema)
	.handler(async ({ input, context, errors }) => {
		await assertNodeCapabilityEnabled(context.user.id, "status");
		const userId = context.user.id;
		await db.transaction(async (transaction) => {
			const [before] = await transaction
				.select({
					id: nodes.id,
					content: nodes.content,
					statusId: nodes.statusId,
				})
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)))
				.for("update");
			if (!before) throw errors.NOT_FOUND();
			if (before.statusId === input.statusId) return;

			// Re-scope the target status by user and board: without this a
			// caller could point one of their nodes at somebody else's status,
			// or at a status that belongs to a different board.
			let nextName: string | null = null;
			if (input.statusId !== null) {
				const [status] = await transaction
					.select({ id: statuses.id, name: statuses.name })
					.from(statuses)
					.where(
						and(
							eq(statuses.id, input.statusId),
							eq(statuses.userId, userId),
							eq(statuses.boardId, input.boardId),
						),
					)
					.limit(1);
				if (!status) throw errors.STATUS_NOT_FOUND();
				nextName = status.name;
			}

			const previousName = before.statusId
				? ((
						await transaction
							.select({ name: statuses.name })
							.from(statuses)
							.where(eq(statuses.id, before.statusId))
							.limit(1)
					)[0]?.name ?? null)
				: null;

			const history = await createHistoryRecorder(transaction, userId);
			await transaction
				.update(nodes)
				.set({ statusId: input.statusId })
				.where(and(eq(nodes.id, input.id), eq(nodes.userId, userId)));
			await history.record({
				nodeId: input.id,
				payload: {
					kind: "status_changed",
					label: historyNodeLabel(before.content),
					before: previousName,
					after: nextName,
				},
			});
		});
	});
