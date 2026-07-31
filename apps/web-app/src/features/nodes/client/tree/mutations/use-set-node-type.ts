import type { TypedMetadata } from "@cascade/outliner/node-types";
import type { QueryKey } from "@tanstack/react-query";
import { useOptimisticNodeMutation } from "@/features/nodes/client/tree/mutations/use-node-mutation";
import { client } from "@/orpc/client";
import { patchRows } from "../cache-helpers";
import { patchRawRow } from "../raw-tree-ops";
import type { VisibleTreeData } from "../tree-data.types";

/** Convert a node's type or update its per-type metadata (e.g. task completion). */
export function useSetTypeMutation(queryKey: QueryKey) {
	const mutation = useOptimisticNodeMutation<
		{ id: string } & TypedMetadata,
		void,
		VisibleTreeData
	>({
		queryKey,
		mutationFn: (vars) => client.nodes.setType(vars),
		patch: (old, vars) =>
			patchRows(
				(rows) =>
					patchRawRow(rows, vars.id, {
						type: vars.type,
						metadata: vars.metadata,
						...(vars.type === "text" ? { recurrence: null } : {}),
					}),
				old,
			),
	});

	return async (id: string, typed: TypedMetadata) => {
		try {
			await mutation.mutateAsync({ id, ...typed });
			return true;
		} catch {
			return false;
		}
	};
}
