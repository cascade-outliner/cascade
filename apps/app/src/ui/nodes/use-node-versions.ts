import { patchRow } from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client, orpc } from "@/orpc/client";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { patchRows } from "@/ui/nodes/virtual-tree/data/cache-helpers";
import type { VisibleTreeData } from "@/ui/nodes/virtual-tree/data/types";

/** This node's prior content versions, newest first. `undefined` while
 * loading; skipped entirely while `nodeId` is `null` (dialog closed). */
export function useNodeVersions(nodeId: string | null) {
	const { data } = useQuery({
		...orpc.nodes.listVersions.queryOptions({ input: { id: nodeId ?? "" } }),
		enabled: nodeId !== null,
	});
	return data;
}

/** Restores a node's content to a prior version and patches it into the
 * given tree's cached rows, mirroring `useUpdateContentMutation`. */
export function useRestoreNodeVersion(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const mutation = useOptimisticNodeMutation<
		{ versionId: string; nodeId: string; content: { root: unknown } },
		{ id: string; content: unknown },
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.restoreVersion({ id: vars.versionId }),
		patch: (old, { nodeId, content }) =>
			patchRows((rows) => patchRow(rows, nodeId, { content }), old),
		onSuccess: (_data, { nodeId }) => {
			toast.success(m.outliner_version_history_restored());
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.listVersions.key({ input: { id: nodeId } }),
			});
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.ancestors.key(),
				predicate: (query) => {
					const chain = query.state.data as { id: string }[] | undefined;
					return chain?.some((ancestor) => ancestor.id === nodeId) ?? false;
				},
			});
		},
		onError: () => {
			toast.error(m.node_save_failed());
			queryClient.invalidateQueries({ queryKey });
		},
	});

	return {
		restore: (versionId: string, nodeId: string, content: { root: unknown }) =>
			mutation.mutate({ versionId, nodeId, content }),
		restoringId: mutation.isPending ? mutation.variables?.versionId : null,
	};
}
