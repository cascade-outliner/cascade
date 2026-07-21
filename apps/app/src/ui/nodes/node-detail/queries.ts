import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "#/orpc/client";
import { existingTagsOptions } from "#/ui/nodes/use-existing-tags";
import { useOptimisticNodeMutation } from "#/ui/nodes/use-optimistic-node-mutation";
import { visibleTreeOptions } from "#/ui/nodes/virtual-tree/data/use-visible-tree";
import type { NodeDetailData } from "./types";

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
		void,
		NodeDetailData
	>({
		queryKey,
		mutationFn: (completed) =>
			client.nodes.setType({
				id: nodeId,
				type: "task",
				metadata: { completed },
			}),
		patch: (old, completed) =>
			old ? { ...old, metadata: { completed } } : old,
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
				? { ...old, dueDate: dueDate ? formatCalendarDate(dueDate) : null }
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

	return {
		toggleTask: (completed: boolean) => toggleTaskMutation.mutate(completed),
		setDueDate: (dueDate: Date | null) => setDueDateMutation.mutate(dueDate),
		setTags: (tags: string[]) => setTagsMutation.mutate(tags),
	};
}
