import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import {
	nextRecurringDueDate,
	type RecurrenceInput,
} from "@cascade/outliner/recurrence";
import { toast } from "@cascade/ui/toast";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { existingTagsOptions } from "#/features/nodes/client/tags/use-existing-tags";
import { useOptimisticNodeMutation } from "#/features/nodes/client/tree/mutations/use-node-mutation";
import { visibleTreeOptions } from "#/features/nodes/client/tree/use-visible-tree";
import { client, orpc } from "#/orpc/client";
import { m } from "#/paraglide/messages.js";
import type { NodeDetailData } from "./node-detail.types";

/** Resolves the slug to a node id and warms the caches the detail page needs. */
export async function loadNodeDetail(queryClient: QueryClient, nodeId: string) {
	queryClient.prefetchQuery(visibleTreeOptions(nodeId));
	queryClient.prefetchQuery(existingTagsOptions());
	await Promise.all([
		queryClient.ensureQueryData(
			orpc.nodes.get.queryOptions({ input: { id: nodeId } }),
		),
		queryClient.ensureQueryData(
			orpc.nodes.ancestors.queryOptions({ input: { id: nodeId } }),
		),
	]);
}

/** The optimistic mutations available from the node detail header (task toggle, due date, tags). */
export function useNodeDetailMutations(nodeId: string, queryKey: QueryKey) {
	const queryClient = useQueryClient();

	const toggleTaskMutation = useOptimisticNodeMutation<
		boolean,
		{ advanced: boolean; nextDueDate: string | null },
		NodeDetailData
	>({
		queryKey,
		mutationFn: (completed) => {
			const current = queryClient.getQueryData<NodeDetailData>(queryKey);
			return client.nodes.setTaskCompleted({
				id: nodeId,
				completed,
				today: formatCalendarDate(new Date()),
				expectedDueDate: current?.dueDate ?? null,
			});
		},
		patch: (old, completed) =>
			old
				? {
						...old,
						...(completed && old.recurrence && old.dueDate
							? {
									dueDate: nextRecurringDueDate(
										old.dueDate,
										old.recurrence,
										formatCalendarDate(new Date()),
									),
									metadata: { completed: false },
								}
							: { metadata: { completed } }),
					}
				: old,
		onSuccess: (result) => {
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
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			});
		},
	});

	const setDueDateMutation = useOptimisticNodeMutation<
		Date | null,
		void,
		NodeDetailData
	>({
		queryKey,
		mutationFn: (dueDate) =>
			client.nodes.setDueDate({
				id: nodeId,
				dueDate: dueDate ? formatCalendarDate(dueDate) : null,
			}),
		patch: (old, dueDate) =>
			old
				? {
						...old,
						dueDate: dueDate ? formatCalendarDate(dueDate) : null,
						recurrence:
							dueDate && old.recurrence
								? { ...old.recurrence, anchorDay: dueDate.getDate() }
								: null,
					}
				: old,
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			}),
	});

	const setTagsMutation = useOptimisticNodeMutation<
		string[],
		void,
		NodeDetailData
	>({
		queryKey,
		mutationFn: (tags) => client.nodes.setTags({ id: nodeId, tags }),
		patch: (old, tags) => (old ? { ...old, tags } : old),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: existingTagsOptions().queryKey,
			}),
	});

	const setRecurrenceMutation = useOptimisticNodeMutation<
		RecurrenceInput | null,
		void,
		NodeDetailData
	>({
		queryKey,
		mutationFn: (recurrence) =>
			client.nodes.setRecurrence({ id: nodeId, recurrence }),
		patch: (old, recurrence) =>
			old
				? {
						...old,
						recurrence:
							recurrence && old.dueDate
								? {
										...recurrence,
										anchorDay: Number(old.dueDate.slice(8, 10)),
									}
								: null,
						metadata:
							recurrence && old.type === "task"
								? { completed: false }
								: old.metadata,
					}
				: old,
	});

	return {
		toggleTask: (completed: boolean) => toggleTaskMutation.mutate(completed),
		setDueDate: (dueDate: Date | null) => setDueDateMutation.mutate(dueDate),
		setRecurrence: (recurrence: RecurrenceInput | null) =>
			setRecurrenceMutation.mutate(recurrence),
		setTags: (tags: string[]) => setTagsMutation.mutate(tags),
	};
}
