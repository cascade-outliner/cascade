import type { PriorityName } from "@cascade/outliner/node-priority";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client, orpc } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

export function useSetPriorityMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const mutation = useOptimisticNodeMutation<
		{ id: string; priority: PriorityName | null },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.setPriority(vars),
		patch: (old, { id, priority }) =>
			patchRows(
				(rows) =>
					rows.map((row) => (row.id === id ? { ...row, priority } : row)),
				old,
			),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
	});

	const rawSetPriority = (id: string, priority: PriorityName | null) =>
		mutation.mutate({ id, priority });

	return (id: string, priority: PriorityName | null) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const row = rows?.find((candidate) => candidate.id === id);
		const previousPriority = row ? (row.priority ?? null) : undefined;

		rawSetPriority(id, priority);

		if (previousPriority !== undefined) {
			undoStore.push({
				undo: () => rawSetPriority(id, previousPriority),
				redo: () => rawSetPriority(id, priority),
			});
		}
	};
}
