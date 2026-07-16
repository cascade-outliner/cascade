import type { TagSummary } from "@cascade/outliner/node-tags";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "@/orpc/client";

export function existingTagsOptions() {
	return orpc.nodes.listTags.queryOptions();
}

/** This user's tags with usage counts, for the tag editor's checklist. */
export function useExistingTags(): TagSummary[] {
	const { data } = useQuery(existingTagsOptions());
	return data ?? [];
}

/** Deletes a tag outright (every node that has it loses it), then refreshes
 * the tag list and any currently-loaded trees/nodes. */
export function useDeleteTag(): (name: string) => Promise<void> {
	const queryClient = useQueryClient();
	return async (name: string) => {
		await client.nodes.deleteTag({ name });
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: existingTagsOptions().queryKey,
			}),
			queryClient.invalidateQueries({ queryKey: orpc.nodes.visibleTree.key() }),
			queryClient.invalidateQueries({ queryKey: orpc.nodes.get.key() }),
		]);
	};
}
