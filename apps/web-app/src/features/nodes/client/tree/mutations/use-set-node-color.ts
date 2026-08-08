import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client, orpc } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

export function useSetColorMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const mutation = useOptimisticNodeMutation<
		{ id: string; color: string | null },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.setColor(vars),
		patch: (old, { id, color }) =>
			patchRows(
				(rows) => rows.map((row) => (row.id === id ? { ...row, color } : row)),
				old,
			),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
	});

	const rawSetColor = (id: string, color: string | null) =>
		mutation.mutate({ id, color });

	return (id: string, color: string | null) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const foundRow = rows?.find((row) => row.id === id);
		const previousColor = foundRow?.color ?? null;

		rawSetColor(id, color);

		if (foundRow !== undefined) {
			undoStore.push({
				undo: () => rawSetColor(id, previousColor),
				redo: () => rawSetColor(id, color),
			});
		}
	};
}
