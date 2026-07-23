import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import { patchRow } from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "@/orpc/client";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { undoStore } from "@/ui/undo/undo-store";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";

export function useSetDueDateMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const mutation = useOptimisticNodeMutation<
		{ id: string; dueDate: string | null },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.setDueDate(vars),
		patch: (old, { id, dueDate }) =>
			patchRows((rows) => patchRow(rows, id, { dueDate }), old),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
	});

	const rawSetDueDate = (id: string, dueDate: string | null) =>
		mutation.mutate({ id, dueDate });

	return (id: string, dueDate: Date | null) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const previousDueDate = rows?.find((row) => row.id === id)?.dueDate;
		const nextDueDate = dueDate ? formatCalendarDate(dueDate) : null;

		rawSetDueDate(id, nextDueDate);

		if (previousDueDate !== undefined) {
			undoStore.push({
				undo: () => rawSetDueDate(id, previousDueDate),
				redo: () => rawSetDueDate(id, nextDueDate),
			});
		}
	};
}
