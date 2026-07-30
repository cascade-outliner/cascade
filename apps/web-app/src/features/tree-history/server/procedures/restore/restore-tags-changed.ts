import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import type { TreeHistoryPayload } from "../../../model/tree-history.schema";
import { historyNodeLabel } from "../../history-persistence";
import { currentTags, type NodeRow, setTags } from "../shared";

export async function restoreTagsChanged(
	transaction: NodeTransaction,
	userId: string,
	nodeId: string,
	current: NodeRow,
	payload: Extract<TreeHistoryPayload, { kind: "tags_changed" }>,
): Promise<TreeHistoryPayload> {
	const before = await currentTags(transaction, nodeId);
	const after = await setTags(transaction, userId, nodeId, payload.before);
	return {
		kind: "tags_changed",
		label: historyNodeLabel(current.content),
		before,
		after,
	};
}
