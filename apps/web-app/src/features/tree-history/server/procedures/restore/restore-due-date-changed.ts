import { eq } from "drizzle-orm";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import type { TreeHistoryPayload } from "../../../model/tree-history.schema";
import { historyNodeLabel } from "../../history-persistence";
import type { NodeRow } from "../shared";

export async function restoreDueDateChanged(
	transaction: NodeTransaction,
	nodeId: string,
	current: NodeRow,
	payload: Extract<TreeHistoryPayload, { kind: "due_date_changed" }>,
	throwNotRestorable: () => never,
): Promise<TreeHistoryPayload> {
	if (payload.beforeRecurrence && (current.type !== "task" || !payload.before))
		throwNotRestorable();
	await transaction
		.update(nodes)
		.set({
			dueDate: payload.before,
			dueTime: payload.beforeTime !== undefined ? payload.beforeTime : null,
			...(payload.beforeRecurrence !== undefined
				? { recurrence: payload.beforeRecurrence }
				: {}),
		})
		.where(eq(nodes.id, nodeId));
	return {
		kind: "due_date_changed",
		label: historyNodeLabel(current.content),
		before: current.dueDate,
		after: payload.before,
		beforeTime: current.dueTime,
		afterTime: payload.beforeTime,
		beforeRecurrence: current.recurrence,
		afterRecurrence: payload.beforeRecurrence,
	};
}
