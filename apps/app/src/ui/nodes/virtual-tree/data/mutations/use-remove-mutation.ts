import { removeSubtree } from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client } from "@/orpc/client";
import { invalidateVersionHistory } from "@/ui/nodes/invalidate-version-history";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";

export function useRemoveMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const mutation = useOptimisticNodeMutation<
		{ id: string },
		{ childrenDeleted: number },
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.delete(vars),
		patch: (old, { id }) => patchRows((rows) => removeSubtree(rows, id), old),
		onSuccess: ({ childrenDeleted }, { id }) => {
			toast.success(
				childrenDeleted > 64
					? m.node_deleted_with_many_children()
					: childrenDeleted > 0
						? m.node_deleted_with_children({ count: childrenDeleted })
						: m.node_deleted(),
			);
			// The deleted node (and any descendants) cascade-delete their
			// node_versions rows too, so any cached version-history entries for
			// them are now gone.
			invalidateVersionHistory(queryClient, id);
		},
	});

	return (id: string) => mutation.mutate({ id });
}
