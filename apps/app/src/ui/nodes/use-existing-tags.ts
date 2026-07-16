import { useQuery, useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "@/orpc/client";

export function existingTagsOptions() {
	return orpc.nodes.tagNames.queryOptions();
}

/** This user's existing tag names, for the tag editor's suggestion list. */
export function useExistingTags(): string[] {
	const { data } = useQuery(existingTagsOptions());
	return data ?? [];
}

/** Deletes a tag outright (every node that has it loses it), then refreshes
 * the suggestion list and any currently-loaded trees/nodes. */
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
