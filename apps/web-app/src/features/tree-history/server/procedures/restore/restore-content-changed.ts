import { eq } from "drizzle-orm";
import { nodeSearchText } from "@/features/nodes/model/node-search-text";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import type { TreeHistoryPayload } from "../../../model/tree-history.schema";
import { historyNodeLabel } from "../../history-persistence";
import type { NodeRow } from "../shared";

export async function restoreContentChanged(
	transaction: NodeTransaction,
	nodeId: string,
	current: NodeRow,
	payload: Extract<TreeHistoryPayload, { kind: "content_changed" }>,
): Promise<TreeHistoryPayload> {
	await transaction
		.update(nodes)
		.set({
			content: payload.before,
			searchText: nodeSearchText(payload.before),
		})
		.where(eq(nodes.id, nodeId));
	return {
		kind: "content_changed",
		label: historyNodeLabel(payload.before),
		before: current.content,
		after: payload.before,
	};
}
