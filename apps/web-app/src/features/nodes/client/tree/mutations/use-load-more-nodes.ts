import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { DueDateRange } from "@cascade/outliner/node-filters";
import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/orpc/client";
import type { VisibleTreeData } from "../tree-data.types";

export function useLoadMoreMutation(
	queryKey: QueryKey,
	rootId: string | null,
	includeCollapsedDescendants: boolean,
	dueDateRange: DueDateRange | null,
	nextCursor: string[] | null,
) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: () =>
			client.nodes.visibleTree({
				rootId,
				cursor: nextCursor,
				includeCollapsedDescendants,
				...(dueDateRange
					? {
							dueDateStart: formatCalendarDate(dueDateRange.start),
							dueDateEnd: formatCalendarDate(dueDateRange.end),
						}
					: {}),
			}),
		onSuccess: (next) => {
			queryClient.setQueryData(queryKey, (old: VisibleTreeData | undefined) =>
				old
					? { rows: [...old.rows, ...next.rows], nextCursor: next.nextCursor }
					: old,
			);
		},
	});

	return async () => {
		if (mutation.isPending || !nextCursor) return;
		await mutation.mutateAsync();
	};
}
