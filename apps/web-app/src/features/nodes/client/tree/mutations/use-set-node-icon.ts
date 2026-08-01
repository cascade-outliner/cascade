import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client, orpc } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

export function useSetIconMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const mutation = useOptimisticNodeMutation<
		{ id: string; icon: string | null },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.setIcon(vars),
		patch: (old, { id, icon }) =>
			patchRows(
				(rows) => rows.map((row) => (row.id === id ? { ...row, icon } : row)),
				old,
			),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
	});

	const rawSetIcon = (id: string, icon: string | null) =>
		mutation.mutate({ id, icon });

	return (id: string, icon: string | null) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const previousIcon = rows?.find((row) => row.id === id)?.icon;

		rawSetIcon(id, icon);

		if (previousIcon !== undefined) {
			undoStore.push({
				undo: () => rawSetIcon(id, previousIcon),
				redo: () => rawSetIcon(id, icon),
			});
		}
	};
}
