import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import { nextRecurringDueDate } from "@cascade/outliner/recurrence";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import {
	COMPLETED_EXIT_DURATION_MS,
	COMPLETED_HIDE_DELAY_MS,
} from "@/features/nodes/client/filters/use-delayed-completion-hide";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { client, orpc } from "@/orpc/client";
import { m } from "@/paraglide/messages.js";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

export function useSetTaskCompletedMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const today = () => formatCalendarDate(new Date());
	const mutation = useOptimisticNodeMutation<
		{ id: string; completed: boolean; expectedDueDate: string | null },
		{ advanced: boolean; nextDueDate: string | null },
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) =>
			client.nodes.setTaskCompleted({ ...vars, today: today() }),
		patch: (old, { id, completed }) =>
			patchRows(
				(rows) =>
					rows.map((row) =>
						row.id === id
							? {
									...row,
									...(completed && row.recurrence && row.dueDate
										? {
												dueDate: nextRecurringDueDate(
													row.dueDate,
													row.recurrence,
													today(),
												),
												metadata: { completed: false },
											}
										: { metadata: { completed } }),
								}
							: row,
					),
				old,
			),
		onSuccess: (result, { completed }) => {
			if (result.advanced && result.nextDueDate) {
				toast.success(
					m.node_recurring_completed({
						date: new Intl.DateTimeFormat(undefined, {
							month: "short",
							day: "numeric",
						}).format(new Date(`${result.nextDueDate}T00:00:00`)),
					}),
				);
			}
			const invalidate = () =>
				queryClient.invalidateQueries({
					queryKey: orpc.nodes.visibleTree.key(),
				});
			if (completed) {
				// A view that hides completed tasks fetches this row's whole
				// subtree server-side once it's marked complete, so refetching
				// right away would yank the row out from under the
				// use-delayed-completion-hide grace period's exit animation.
				setTimeout(
					invalidate,
					COMPLETED_HIDE_DELAY_MS + COMPLETED_EXIT_DURATION_MS,
				);
			} else {
				invalidate();
			}
		},
	});

	return (id: string, completed: boolean, expectedDueDate: string | null) =>
		mutation.mutate({ id, completed, expectedDueDate });
}
