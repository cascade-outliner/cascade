import { eq } from "drizzle-orm";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import type { TreeHistoryPayload } from "../../../model/tree-history.schema";
import { historyNodeLabel } from "../../history-persistence";
import type { NodeRow } from "../shared";

export async function restoreIconChanged(
	transaction: NodeTransaction,
	nodeId: string,
	current: NodeRow,
	payload: Extract<TreeHistoryPayload, { kind: "icon_changed" }>,
): Promise<TreeHistoryPayload> {
	await transaction
		.update(nodes)
		.set({ icon: payload.before })
		.where(eq(nodes.id, nodeId));
	return {
		kind: "icon_changed",
		label: historyNodeLabel(current.content),
		before: current.icon,
		after: payload.before,
	};
}
