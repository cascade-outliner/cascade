import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { VisibleTreeData } from "./tree-data.types";

export const patchRows = (
	fn: (rows: VisibleNodeRow[]) => VisibleNodeRow[],
	old: VisibleTreeData | undefined,
) => (old ? { ...old, rows: fn(old.rows) } : old);

/** Builds the `setRows` updater every mutation uses to patch the shared cache entry. */
export function makeSetRows(queryClient: QueryClient, queryKey: QueryKey) {
	return (fn: (rows: VisibleNodeRow[]) => VisibleNodeRow[]) => {
		queryClient.setQueryData(queryKey, (old: VisibleTreeData | undefined) =>
			patchRows(fn, old),
		);
	};
}
