import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { captureCurrentPosition } from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { collectDescendants } from "../raw-tree-ops";
import type { VisibleTreeData } from "../tree-data.types";
import { makeRawDeleteRestore } from "./delete-restore";

export function useRemoveMutation(queryKey: QueryKey, rows: VisibleNodeRow[]) {
	const queryClient = useQueryClient();
	const { rawDelete, rawRestore } = makeRawDeleteRestore(queryClient, queryKey);

	return (id: string) => {
		const row = rows.find((r) => r.id === id);
		const target = captureCurrentPosition(rows, id);
		if (!row || !target) return;

		let childrenDeleted = 0;

		const run = async () => {
			// Every descendant is already in the shared raw cache, so this is a
			// plain in-memory walk — no network round trip needed before the
			// delete goes out, and collapsed descendants are included for free.
			const rawRows =
				queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows ?? [];
			const descendants = collectDescendants(rawRows, id);
			const result = await rawDelete(id);
			childrenDeleted = result?.childrenDeleted ?? 0;
			undoStore.push({
				undo: () => rawRestore({ row, descendants, target }),
				redo: async () => {
					await rawDelete(id, { silent: true });
				},
			});
		};

		// One toast for the whole operation (exit animation and server round
		// trip): a spinner while pending, morphing in place into
		// success/error on settle — same pattern as duplicate.
		return toast
			.promise(run(), {
				loading: m.node_deleting(),
				success: () =>
					childrenDeleted === 0
						? m.node_deleted()
						: childrenDeleted > 64
							? m.node_deleted_with_many_children()
							: m.node_deleted_with_children({ count: childrenDeleted }),
				error: m.node_delete_failed(),
			})
			.catch(() => {
				// Already surfaced by the error toast above.
			});
	};
}
