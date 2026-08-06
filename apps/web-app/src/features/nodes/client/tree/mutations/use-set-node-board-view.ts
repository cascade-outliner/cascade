import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client, orpc } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

export function useSetBoardViewMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const mutation = useOptimisticNodeMutation<
		{ id: string; isBoard: boolean },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.setBoardView(vars),
		patch: (old, { id, isBoard }) =>
			patchRows(
				(rows) =>
					rows.map((row) => (row.id === id ? { ...row, isBoard } : row)),
				old,
			),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
	});

	const rawSetBoardView = (id: string, isBoard: boolean) =>
		mutation.mutate({ id, isBoard });

	return (id: string, isBoard: boolean) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const previousIsBoard = rows?.find((row) => row.id === id)?.isBoard;

		rawSetBoardView(id, isBoard);

		if (previousIsBoard !== undefined) {
			undoStore.push({
				undo: () => rawSetBoardView(id, previousIsBoard),
				redo: () => rawSetBoardView(id, isBoard),
			});
		}
	};
}
