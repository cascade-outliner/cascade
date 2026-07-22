import { toast } from "@cascade/ui/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client, orpc } from "@/orpc/client";
import { invalidateVersionHistory } from "@/ui/nodes/invalidate-version-history";

/** Every content version across the whole tree, newest first. `undefined`
 * while loading; skipped entirely while `enabled` is false (dialog closed
 * or viewer isn't premium). */
export function useTreeVersions(enabled: boolean) {
	const { data } = useQuery({
		...orpc.nodes.listTreeVersions.queryOptions(),
		enabled,
	});
	return data;
}

/** Restores a version from anywhere in the tree. Unlike `useRestoreNodeVersion`,
 * the restored node's row isn't necessarily loaded into any currently-open
 * tree view (it could be deep inside a collapsed or unopened subtree), so
 * this invalidates the affected queries broadly instead of patching a
 * single cache entry. */
export function useRestoreTreeVersion() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (versionId: string) =>
			client.nodes.restoreVersion({ id: versionId }),
		onSuccess: () => {
			toast.success(m.outliner_version_history_restored());
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.visibleTree.key(),
			});
			queryClient.invalidateQueries({ queryKey: orpc.nodes.ancestors.key() });
			// Which node was restored isn't tracked client-side here (only the
			// version id is), so this busts every node's cached version list
			// broadly rather than a single one.
			invalidateVersionHistory(queryClient);
		},
		onError: () => {
			toast.error(m.node_save_failed());
		},
	});

	return {
		restore: (versionId: string) => mutation.mutate(versionId),
		restoringId: mutation.isPending ? mutation.variables : null,
	};
}
