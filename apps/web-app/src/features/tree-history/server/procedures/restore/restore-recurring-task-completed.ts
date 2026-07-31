import type { NodeMetadata } from "@cascade/outliner/node-types";
import { eq } from "drizzle-orm";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import type { TreeHistoryPayload } from "../../../model/tree-history.schema";
import { historyNodeLabel } from "../../history-persistence";
import type { NodeRow } from "../shared";

export async function restoreRecurringTaskCompleted(
	transaction: NodeTransaction,
	nodeId: string,
	current: NodeRow,
	payload: Extract<TreeHistoryPayload, { kind: "recurring_task_completed" }>,
	throwNotRestorable: () => never,
): Promise<TreeHistoryPayload> {
	if (current.type !== "task") throwNotRestorable();
	await transaction
		.update(nodes)
		.set({
			dueDate: payload.before.dueDate,
			metadata: payload.before.metadata as NodeMetadata,
		})
		.where(eq(nodes.id, nodeId));
	return {
		kind: "recurring_task_completed",
		label: historyNodeLabel(current.content),
		before: {
			dueDate: current.dueDate,
			metadata: current.metadata,
		},
		after: payload.before,
	};
}
