import type { NodeMetadata } from "@cascade/outliner/node-types";
import { eq } from "drizzle-orm";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import type { TreeHistoryPayload } from "../../../model/tree-history.schema";
import { historyNodeLabel } from "../../history-persistence";
import type { NodeRow } from "../shared";

export async function restoreRecurrenceChanged(
	transaction: NodeTransaction,
	nodeId: string,
	current: NodeRow,
	payload: Extract<TreeHistoryPayload, { kind: "recurrence_changed" }>,
	throwNotRestorable: () => never,
): Promise<TreeHistoryPayload> {
	if (
		current.type !== "task" ||
		(payload.before.recurrence && !current.dueDate)
	)
		throwNotRestorable();
	await transaction
		.update(nodes)
		.set({
			recurrence: payload.before.recurrence as typeof nodes.recurrence._.data,
			metadata: payload.before.metadata as NodeMetadata,
		})
		.where(eq(nodes.id, nodeId));
	return {
		kind: "recurrence_changed",
		label: historyNodeLabel(current.content),
		before: {
			recurrence: current.recurrence,
			metadata: current.metadata,
		},
		after: payload.before,
	};
}
