import {
	collapseNode,
	expandNode,
	patchRow,
} from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { client } from "@/orpc/client";
import { makeSetRows, patchRows } from "../cache-helpers";
import { fetchFullSubtree } from "../fetch-full-subtree";
import type { VisibleTreeData } from "../tree-data.types";

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
				const subtreeRows = await fetchFullSubtree(id);
				setRows((rows) => expandNode(rows, id, subtreeRows));
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
