import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import { eq } from "drizzle-orm";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import type { TreeHistoryPayload } from "../../../model/tree-history.schema";
import { historyNodeLabel } from "../../history-persistence";
import type { NodeRow } from "../shared";

export async function restoreTypeChanged(
	transaction: NodeTransaction,
	nodeId: string,
	current: NodeRow,
	payload: Extract<TreeHistoryPayload, { kind: "type_changed" }>,
): Promise<TreeHistoryPayload> {
	await transaction
		.update(nodes)
		.set({
			type: payload.before.type as NodeTypeName,
			metadata: payload.before.metadata as NodeMetadata,
			...("recurrence" in payload.before
				? { recurrence: payload.before.recurrence }
				: {}),
		})
		.where(eq(nodes.id, nodeId));
	return {
		kind: "type_changed",
		label: historyNodeLabel(current.content),
		before: {
			type: current.type,
			metadata: current.metadata,
			recurrence: current.recurrence,
		},
		after: payload.before,
	};
}
