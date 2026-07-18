import { orpc } from "@/orpc/client";

export function visibleTreeOptions(
	rootId: string | null,
	includeCollapsedDescendants = false,
) {
	return orpc.nodes.visibleTree.queryOptions({
		input: { rootId, includeCollapsedDescendants },
	});
}
