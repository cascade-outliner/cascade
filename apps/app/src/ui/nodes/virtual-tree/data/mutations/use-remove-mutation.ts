import { captureCurrentPosition } from "@cascade/outliner/visible-rows";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { undoStore } from "@/ui/undo/undo-store";
import { fetchFullSubtree } from "../fetch-full-subtree";
import type { VisibleTreeData } from "../types";
import { makeRawDeleteRestore } from "./raw-delete-restore";

export function useRemoveMutation(queryKey: QueryKey) {
	const queryClient = useQueryClient();
	const { rawDelete, rawRestore } = makeRawDeleteRestore(queryClient, queryKey);

	return (id: string) => {
		const rows = queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows;
		const row = rows?.find((r) => r.id === id);
		const target = rows && captureCurrentPosition(rows, id);
		if (!row || !target) return;

		const run = async () => {
			// Fetched before the actual delete request goes out (the optimistic
			// cache patch inside rawDelete doesn't touch the server), so this
			// always sees the subtree that's about to be deleted, collapsed
			// descendants included, never a partial post-delete result.
			const descendants = row.hasChildren
				? await fetchFullSubtree(id, { includeCollapsedDescendants: true })
				: [];
			await rawDelete(id);
			undoStore.push({
				undo: () => rawRestore({ row, descendants, target }),
				redo: () => rawDelete(id, { silent: true }),
			});
		};
		run();
	};
}
