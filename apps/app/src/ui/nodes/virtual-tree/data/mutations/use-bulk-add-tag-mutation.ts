import { addTag } from "@cascade/outliner/node-tags";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { client } from "@/orpc/client";
import { existingTagsOptions } from "@/ui/nodes/use-existing-tags";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";

export function useBulkAddTagMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();

	const mutation = useOptimisticNodeMutation<
		{ ids: string[]; tag: string },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.bulkAddTag(vars),
		patch: (old, { ids, tag }) =>
			patchRows((rows) => {
				const idSet = new Set(ids);
				return rows.map((r) =>
					idSet.has(r.id) ? { ...r, tags: addTag(r.tags, tag) } : r,
				);
			}, old),
		onSuccess: () => {
			// A brand-new tag name may have just been created; refresh the
			// suggestion list so it's offered elsewhere without a reload.
			queryClient.invalidateQueries({
				queryKey: existingTagsOptions().queryKey,
			});
		},
	});

	return (ids: string[], tag: string) => mutation.mutate({ ids, tag });
}
