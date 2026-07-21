import { removeSubtrees } from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { client } from "@/orpc/client";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";

export function useBulkRemoveMutation(queryKey: QueryKey) {
	const mutation = useOptimisticNodeMutation<
		{ ids: string[] },
		{ childrenDeleted: number },
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.bulkDelete(vars),
		patch: (old, { ids }) =>
			patchRows((rows) => removeSubtrees(rows, ids), old),
	});

	return (ids: string[]) => mutation.mutate({ ids });
}
