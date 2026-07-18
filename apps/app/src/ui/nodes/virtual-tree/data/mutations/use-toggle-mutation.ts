import {
	collapseNode,
	expandNode,
	patchRow,
} from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { client } from "@/orpc/client";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { makeSetRows, patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";

export function useToggleMutation(
	queryKey: QueryKey,
	includeCollapsedDescendants: boolean,
) {
	const queryClient = useQueryClient();
	const setRows = makeSetRows(queryClient, queryKey);

	const mutation = useOptimisticNodeMutation<
		{ id: string; expanded: boolean },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: async ({ id, expanded }) => {
			if (includeCollapsedDescendants) {
				await client.nodes.toggleExpanded({ id, expanded });
				return;
			}
			if (expanded) {
				const subtree = await client.nodes.visibleTree({ rootId: id });
				setRows((rows) => expandNode(rows, id, subtree.rows));
				await client.nodes.toggleExpanded({ id, expanded: true });
			} else {
				await client.nodes.toggleExpanded({ id, expanded: false });
			}
		},
		patch: (old, { id, expanded }) =>
			patchRows((rows) => {
				if (includeCollapsedDescendants) {
					return patchRow(rows, id, { expanded });
				}
				return expanded
					? patchRow(rows, id, { expanded: true })
					: collapseNode(rows, id);
			}, old),
	});

	return (id: string, expanded: boolean) => mutation.mutate({ id, expanded });
}
