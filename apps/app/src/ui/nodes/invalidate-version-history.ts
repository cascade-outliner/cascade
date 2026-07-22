import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";

/**
 * Busts the version-history queries a node's content change, deletion, or
 * restore can make stale: its own `listVersions` list, and the tree-wide
 * `listTreeVersions` list (whose entries also embed each node's *current*
 * content, so any content change makes those entries stale too, not just
 * the list itself). Pass `nodeId` when it's known for a precise, single-node
 * invalidation; omit it to bust every node's cached list broadly (e.g. after
 * a tree-wide restore, where only the version id — not its owning node — is
 * known client-side).
 */
export function invalidateVersionHistory(
	queryClient: QueryClient,
	nodeId?: string,
) {
	queryClient.invalidateQueries({
		queryKey: nodeId
			? orpc.nodes.listVersions.key({ input: { id: nodeId } })
			: orpc.nodes.listVersions.key(),
	});
	queryClient.invalidateQueries({
		queryKey: orpc.nodes.listTreeVersions.key(),
	});
}
