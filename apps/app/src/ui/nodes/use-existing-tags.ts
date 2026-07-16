import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";

export function existingTagsOptions() {
	return orpc.nodes.tagNames.queryOptions();
}

/** This user's existing tag names, for the tag editor's suggestion list. */
export function useExistingTags(): string[] {
	const { data } = useQuery(existingTagsOptions());
	return data ?? [];
}
