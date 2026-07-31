import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import {
	captureCurrentPosition,
	type MoveTarget,
} from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import { moveRawRow, patchRawRow } from "../raw-tree-ops";
import type { VisibleTreeData } from "../tree-data.types";

interface MoveVars {
	id: string;
	target: MoveTarget;
	expandParentId?: string;
}

export function useMoveMutation(queryKey: QueryKey, rows: VisibleNodeRow[]) {
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
			patchRows((rawRows) => {
				const expanded = expandParentId
					? patchRawRow(rawRows, expandParentId, { expanded: true })
					: rawRows;
				return moveRawRow(expanded, id, target);
			}, old),
		// The optimistic order moveRawRow computes mirrors the server's
		// fractional-index placement closely enough that a success needs no
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
		const previousTarget = captureCurrentPosition(rows, id);

		const result = mutation
			.mutateAsync({
				id,
				target,
				expandParentId: moveOptions.expandParentId,
			})
			.then(
				() => true,
				() => false,
			);

		if (previousTarget) {
			undoStore.push({
				undo: () => rawMove(id, previousTarget),
				redo: () => rawMove(id, target, moveOptions),
			});
		}

		return result;
	};
}
