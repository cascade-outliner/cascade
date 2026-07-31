import { markExpansionReveal } from "@cascade/outliner/expansion-reveal-motion";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { client } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import { patchRawRow, revealedDescendantIds } from "../raw-tree-ops";
import type { VisibleTreeData } from "../tree-data.types";

/**
 * Every descendant is already in the shared raw cache (the whole tree is
 * fetched once), so expanding a node no longer needs a network round trip
 * to discover its children — just flip `expanded` and let the rendered
 * view (`buildVisibleTree`) pick them back up.
 */
export function useToggleMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();

	const mutation = useOptimisticNodeMutation<
		{ id: string; expanded: boolean },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: ({ id, expanded }) =>
			client.nodes.toggleExpanded({ id, expanded }),
		patch: (old, { id, expanded }) =>
			patchRows((rows) => patchRawRow(rows, id, { expanded }), old),
	});

	return (id: string, expanded: boolean) => {
		if (expanded) {
			const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
			if (rows) markExpansionReveal(revealedDescendantIds(rows, id));
		}
		mutation.mutate({ id, expanded });
	};
}
