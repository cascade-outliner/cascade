import { eq } from "drizzle-orm";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import type { TreeHistoryPayload } from "../../../model/tree-history.schema";
import { historyNodeLabel } from "../../history-persistence";
import type { NodeRow } from "../shared";

export async function restoreColorChanged(
	transaction: NodeTransaction,
	nodeId: string,
	current: NodeRow,
	payload: Extract<TreeHistoryPayload, { kind: "color_changed" }>,
): Promise<TreeHistoryPayload> {
	await transaction
		.update(nodes)
		.set({ color: payload.before ?? null })
		.where(eq(nodes.id, nodeId));
	return {
		kind: "color_changed",
		label: historyNodeLabel(current.content),
		before: current.color ?? null,
		after: payload.before,
	};
}
