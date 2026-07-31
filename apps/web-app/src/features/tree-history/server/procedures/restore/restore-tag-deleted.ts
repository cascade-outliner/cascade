import { and, eq, inArray, sql } from "drizzle-orm";
import {
	nodes,
	nodeTags,
	tags,
} from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import type {
	TreeHistoryPayload,
	TreeHistoryRestoreResult,
} from "../../../model/tree-history.schema";
import type { HistoryRecorder } from "../../history-persistence";

export async function restoreTagDeleted(
	transaction: NodeTransaction,
	userId: string,
	payload: Extract<TreeHistoryPayload, { kind: "tag_deleted" }>,
	sourceEventId: string,
	history: HistoryRecorder,
): Promise<TreeHistoryRestoreResult> {
	const existingNodeIds =
		payload.nodeIds.length === 0
			? []
			: (
					await transaction
						.select({ id: nodes.id })
						.from(nodes)
						.where(
							and(eq(nodes.userId, userId), inArray(nodes.id, payload.nodeIds)),
						)
				).map(({ id }) => id);
	const [tag] = await transaction
		.insert(tags)
		.values({ userId, name: payload.name })
		.onConflictDoUpdate({
			target: [tags.userId, tags.name],
			set: { name: sql`excluded.name` },
		})
		.returning({ id: tags.id });
	if (tag && existingNodeIds.length > 0) {
		await transaction
			.insert(nodeTags)
			.values(existingNodeIds.map((nodeId) => ({ nodeId, tagId: tag.id })))
			.onConflictDoNothing();
	}
	const eventId = await history.record({
		nodeId: null,
		payload: {
			kind: "tag_restored",
			label: payload.name,
			name: payload.name,
			nodeIds: existingNodeIds,
		},
		restoredFromEventId: sourceEventId,
	});
	return { eventId: eventId as string, affectedNodeIds: existingNodeIds };
}
