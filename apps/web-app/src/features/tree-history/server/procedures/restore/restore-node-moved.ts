import { eq, sql } from "drizzle-orm";
import { nodes } from "@/features/nodes/server/persistence/node-tables";
import type { NodeTransaction } from "@/features/nodes/server/persistence/sibling-order";
import { ancestorsOf } from "@/features/nodes/server/persistence/tree-cte";
import type { TreeHistoryPayload } from "../../../model/tree-history.schema";
import {
	captureHistoryLocation,
	historyNodeLabel,
} from "../../history-persistence";
import {
	existingParentOrRoot,
	type NodeRow,
	orderAtTargetOrAppend,
} from "../shared";

export async function restoreNodeMoved(
	transaction: NodeTransaction,
	userId: string,
	nodeId: string,
	current: NodeRow,
	payload: Extract<TreeHistoryPayload, { kind: "node_moved" }>,
	throwInvalidMove: () => never,
): Promise<TreeHistoryPayload> {
	const before = await captureHistoryLocation(
		transaction,
		userId,
		current.parentId,
		current.order,
	);
	const parentId = await existingParentOrRoot(
		transaction,
		userId,
		payload.before.parentId,
	);
	if (parentId) {
		const chain = (await transaction.execute(sql`
			WITH RECURSIVE ${ancestorsOf(parentId, userId)}
			SELECT id FROM chain
		`)) as unknown as { id: string }[];
		if (chain.some(({ id }) => id === nodeId)) {
			throwInvalidMove();
		}
	}
	const target =
		parentId === payload.before.parentId
			? payload.before.target
			: ({ position: "append" } as const);
	const order = await orderAtTargetOrAppend(
		transaction,
		userId,
		parentId,
		target,
	);
	await transaction
		.update(nodes)
		.set({ parentId, order })
		.where(eq(nodes.id, nodeId));
	const after = await captureHistoryLocation(
		transaction,
		userId,
		parentId,
		order,
		target,
	);
	return {
		kind: "node_moved",
		label: historyNodeLabel(current.content),
		before,
		after,
	};
}
