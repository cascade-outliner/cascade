import { patchRow } from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client, orpc } from "@/orpc/client";
import { invalidateVersionHistory } from "@/ui/nodes/invalidate-version-history";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";

export function useUpdateContentMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();

	const mutation = useOptimisticNodeMutation<
		{ id: string; content: { root: unknown } },
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.updateContent(vars),
		patch: (old, { id, content }) =>
			patchRows((rows) => patchRow(rows, id, { content }), old),
		onSuccess: (_data, { id }) => {
			// Bust breadcrumbs, but only for chains the edited node is actually
			// part of, rather than every ancestors cache entry.
			queryClient.invalidateQueries({
				queryKey: orpc.nodes.ancestors.key(),
				predicate: (query) => {
					const chain = query.state.data as { id: string }[] | undefined;
					return chain?.some((ancestor) => ancestor.id === id) ?? false;
				},
			});
			// A content edit may have just snapshotted a new version, and always
			// changes what "current content" means for any cached version-history
			// entry belonging to this node.
			invalidateVersionHistory(queryClient, id);
		},
		onError: () => {
			toast.error(m.node_save_failed());
			queryClient.invalidateQueries({ queryKey });
		},
	});

	return (id: string, content: { root: unknown }) =>
		mutation.mutate({ id, content });
}
