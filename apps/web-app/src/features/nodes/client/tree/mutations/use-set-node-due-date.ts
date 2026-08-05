import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { CalendarTimeString } from "@cascade/outliner/calendar-time";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client, orpc } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

export function useSetDueDateMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const mutation = useOptimisticNodeMutation<
		{
			id: string;
			dueDate: string | null;
			dueTime: CalendarTimeString | null;
		},
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.setDueDate(vars),
		patch: (old, { id, dueDate, dueTime }) =>
			patchRows(
				(rows) =>
					rows.map((row) =>
						row.id === id
							? {
									...row,
									dueDate,
									dueTime: dueDate ? dueTime : null,
									recurrence:
										dueDate && row.recurrence
											? {
													...row.recurrence,
													anchorDay: Number(dueDate.slice(8, 10)),
												}
											: null,
								}
							: row,
					),
				old,
			),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
	});

	const rawSetDueDate = (
		id: string,
		dueDate: string | null,
		dueTime: CalendarTimeString | null,
	) => mutation.mutate({ id, dueDate, dueTime: dueDate ? dueTime : null });

	return (
		id: string,
		dueDate: Date | null,
		dueTime: CalendarTimeString | null,
	) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const previousRow = rows?.find((row) => row.id === id);
		const previousDueDate = previousRow?.dueDate;
		const previousDueTime = previousRow?.dueTime ?? null;
		const nextDueDate = dueDate ? formatCalendarDate(dueDate) : null;
		const nextDueTime = nextDueDate ? dueTime : null;

		rawSetDueDate(id, nextDueDate, nextDueTime);

		if (previousDueDate !== undefined) {
			undoStore.push({
				undo: () => rawSetDueDate(id, previousDueDate, previousDueTime),
				redo: () => rawSetDueDate(id, nextDueDate, nextDueTime),
			});
		}
	};
}
