import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import { patchRow } from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "@/orpc/client";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
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

	return (id: string, dueDate: Date | null) =>
		mutation.mutate({
			id,
			dueDate: dueDate ? formatCalendarDate(dueDate) : null,
		});
}
