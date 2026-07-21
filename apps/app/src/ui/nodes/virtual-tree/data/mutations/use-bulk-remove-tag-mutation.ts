import { removeTag } from "@cascade/outliner/node-tags";
import type { QueryKey } from "@tanstack/react-query";
import { client } from "@/orpc/client";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";

export function useBulkRemoveTagMutation(queryKey: QueryKey) {
	const mutation = useOptimisticNodeMutation<
		{ ids: string[]; tag: string },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.bulkRemoveTag(vars),
		patch: (old, { ids, tag }) =>
			patchRows((rows) => {
				const idSet = new Set(ids);
				return rows.map((r) =>
					idSet.has(r.id) ? { ...r, tags: removeTag(r.tags, tag) } : r,
				);
			}, old),
	});

	return (ids: string[], tag: string) => mutation.mutate({ ids, tag });
}
