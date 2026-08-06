import type { PriorityName } from "@cascade/outliner/node-priority";
import { eq } from "drizzle-orm";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import type { TreeHistoryPayload } from "../../../model/tree-history.schema";
import { historyNodeLabel } from "../../history-persistence";
import type { NodeRow } from "../shared";

export async function restorePriorityChanged(
	transaction: NodeTransaction,
	nodeId: string,
	current: NodeRow,
	payload: Extract<TreeHistoryPayload, { kind: "priority_changed" }>,
): Promise<TreeHistoryPayload> {
	const before = payload.before as PriorityName | null;
	await transaction
		.update(nodes)
		.set({ priority: before })
		.where(eq(nodes.id, nodeId));
	return {
		kind: "priority_changed",
		label: historyNodeLabel(current.content),
		before: current.priority,
		after: before,
	};
}
