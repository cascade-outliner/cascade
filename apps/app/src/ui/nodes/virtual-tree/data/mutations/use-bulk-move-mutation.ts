import {
	bulkMoveSubtrees,
	type MoveTarget,
} from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { client } from "@/orpc/client";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";

interface BulkMoveVars {
	ids: string[];
	target: MoveTarget;
}

export function useBulkMoveMutation(queryKey: QueryKey) {
	const mutation = useOptimisticNodeMutation<
		BulkMoveVars,
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: ({ ids, target }) =>
			client.nodes.bulkMove(
				target.position === "append"
					? { ids, parentId: target.parentId, position: "append" }
					: {
							ids,
							parentId: target.parentId,
							position: target.position,
							targetId: target.targetId,
						},
			),
		patch: (old, { ids, target }) =>
			patchRows((rows) => bulkMoveSubtrees(rows, ids, target), old),
		// Server-computed fractional order is authoritative and the optimistic
		// bulkMoveSubtrees splice already matches it, so a success needs no
		// reconciliation; onError falls back to invalidating (the default).
	});

	return (ids: string[], target: MoveTarget) =>
		mutation.mutate({ ids, target });
}
