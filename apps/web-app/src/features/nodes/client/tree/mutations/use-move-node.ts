import {
	captureCurrentPosition,
	type MoveTarget,
	moveSubtree,
	patchRow,
} from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

interface MoveVars {
	id: string;
	target: MoveTarget;
	expandParentId?: string;
}

export function useMoveMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const mutation = useOptimisticNodeMutation<MoveVars, void, VisibleTreeData>({
		queryKey,
		mutationFn: async ({ id, target, expandParentId }) => {
			await Promise.all([
				client.nodes.move(
					target.position === "append"
						? { id, parentId: target.parentId, position: "append" }
						: {
								id,
								parentId: target.parentId,
								position: target.position,
								targetId: target.targetId,
							},
				),
				expandParentId
					? client.nodes.toggleExpanded({ id: expandParentId, expanded: true })
					: null,
			]);
		},
		patch: (old, { id, target, expandParentId }) =>
			patchRows((rows) => {
				const expanded = expandParentId
					? patchRow(rows, expandParentId, { expanded: true })
					: rows;
				return moveSubtree(expanded, id, target);
			}, old),
		// Server-computed fractional order is authoritative and the optimistic
		// moveSubtree splice already matches it, so a success needs no
		// reconciliation; onError falls back to invalidating (the default).
	});

	const rawMove = (
		id: string,
		target: MoveTarget,
		moveOptions: { expandParentId?: string } = {},
	) =>
		mutation.mutate({
			id,
			target,
			expandParentId: moveOptions.expandParentId,
		});

	return (
		id: string,
		target: MoveTarget,
		moveOptions: { expandParentId?: string } = {},
	) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const previousTarget = rows && captureCurrentPosition(rows, id);

		rawMove(id, target, moveOptions);

		if (previousTarget) {
			undoStore.push({
				undo: () => rawMove(id, previousTarget),
				redo: () => rawMove(id, target, moveOptions),
			});
		}
	};
}
