import type { StatusSummary } from "@cascade/outliner/node-statuses";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { existingStatusesOptions } from "@/features/nodes/client/statuses/use-existing-statuses";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client, orpc } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

/**
 * `boardId` is the board this tree view belongs to, if any (see per-board
 * statuses) — `undefined` for a plain tree/outline that isn't a board's
 * direct-children view, where status assignment isn't offered in the UI, so
 * `setStatus` is never actually expected to be called.
 */
export function useSetStatusMutation(queryKey: QueryKey, boardId?: string) {
	const queryClient = useQueryClient();
	const mutation = useOptimisticNodeMutation<
		{ id: string; statusId: string | null },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) =>
			client.nodes.setStatus({ ...vars, boardId: boardId ?? "" }),
		// Rows carry the status denormalized, so the optimistic patch looks the
		// chosen status up in the already-cached list rather than waiting for
		// the tree to refetch just to learn its name and color.
		patch: (old, { id, statusId }) => {
			const statuses =
				queryClient.getQueryData<StatusSummary[]>(
					existingStatusesOptions(boardId ?? "").queryKey,
				) ?? [];
			const status = statuses.find((candidate) => candidate.id === statusId);
			return patchRows(
				(rows) =>
					rows.map((row) =>
						row.id === id ? { ...row, status: status ?? null } : row,
					),
				old,
			);
		},
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
	});

	const rawSetStatus = (id: string, statusId: string | null) => {
		if (!boardId) return;
		mutation.mutate({ id, statusId });
	};

	return (id: string, statusId: string | null) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const row = rows?.find((candidate) => candidate.id === id);
		const previousStatusId = row ? (row.status?.id ?? null) : undefined;

		rawSetStatus(id, statusId);

		if (previousStatusId !== undefined) {
			undoStore.push({
				undo: () => rawSetStatus(id, previousStatusId),
				redo: () => rawSetStatus(id, statusId),
			});
		}
	};
}
