import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { QueryKey } from "@tanstack/react-query";
import { client } from "@/orpc/client";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";

export function useBulkSetDueDateMutation(queryKey: QueryKey) {
	const mutation = useOptimisticNodeMutation<
		{ ids: string[]; dueDate: string | null },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.bulkSetDueDate(vars),
		patch: (old, { ids, dueDate }) =>
			patchRows((rows) => {
				const idSet = new Set(ids);
				return rows.map((r) => (idSet.has(r.id) ? { ...r, dueDate } : r));
			}, old),
	});

	return (ids: string[], dueDate: Date | null) =>
		mutation.mutate({
			ids,
			dueDate: dueDate ? formatCalendarDate(dueDate) : null,
		});
}
