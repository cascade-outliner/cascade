import { orpc } from "@/orpc/client";

/** The whole tree, flat and unordered, fetched once and shared by every view. */
export function visibleTreeOptions() {
	return orpc.nodes.visibleTree.queryOptions();
}
