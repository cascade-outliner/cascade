import { patchRow } from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { existingTagsOptions } from "@/features/nodes/client/tags/use-existing-tags";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";

export function useSetTagsMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();

	const mutation = useOptimisticNodeMutation<
		{ id: string; tags: string[] },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.setTags(vars),
		patch: (old, { id, tags }) =>
			patchRows((rows) => patchRow(rows, id, { tags }), old),
		onSuccess: () => {
			// A brand-new tag name may have just been created; refresh the
			// suggestion list so it's offered elsewhere without a reload.
			queryClient.invalidateQueries({
				queryKey: existingTagsOptions().queryKey,
			});
		},
	});

	const rawSetTags = (id: string, tags: string[]) =>
		mutation.mutate({ id, tags });

	return (id: string, tags: string[]) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const previousTags = rows?.find((row) => row.id === id)?.tags;

		rawSetTags(id, tags);

		if (previousTags !== undefined) {
			undoStore.push({
				undo: () => rawSetTags(id, previousTags),
				redo: () => rawSetTags(id, tags),
			});
		}
	};
}
