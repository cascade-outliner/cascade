import type { TypedMetadata } from "@cascade/outliner/node-types";
import { patchRow } from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { client } from "@/orpc/client";
import { useOptimisticNodeMutation } from "@/ui/nodes/use-optimistic-node-mutation";
import { patchRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";

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
					patchRow(rows, vars.id, { type: vars.type, metadata: vars.metadata }),
				old,
			),
	});

	return (id: string, typed: TypedMetadata) =>
		mutation.mutate({ id, ...typed });
}
