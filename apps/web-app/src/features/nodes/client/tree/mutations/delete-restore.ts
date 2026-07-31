import type { FlatNodeRow, TypedMetadata } from "@cascade/outliner/node-types";
import {
	markRowRestored,
	playRowExit,
} from "@cascade/outliner/row-lifecycle-motion";
import type { MoveTarget } from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client } from "@/orpc/client";
import { makeSetRows } from "../cache-helpers";
import { insertRawRowAt, removeRawSubtree } from "../raw-tree-ops";

export interface DeleteSnapshot {
	row: FlatNodeRow;
	descendants: FlatNodeRow[];
	target: MoveTarget;
}

function toSnapshotInput(row: FlatNodeRow) {
	return {
		id: row.id,
		content: row.content as { root: unknown } | null,
		expanded: row.expanded,
		dueDate: row.dueDate,
		recurrence: row.recurrence ?? null,
		tags: row.tags,
		...({ type: row.type, metadata: row.metadata } as TypedMetadata),
	};
}

function toRestoreInput({ row, descendants, target }: DeleteSnapshot) {
	return {
		parentId: target.parentId,
		target:
			target.position === "append"
				? { position: "append" as const }
				: { position: target.position, targetId: target.targetId },
		root: toSnapshotInput(row),
		descendants: descendants.map((d) => ({
			...toSnapshotInput(d),
			parentId: d.parentId as string,
			order: d.order,
		})),
	};
}

/**
 * The delete/restore primitives shared by `useRemoveMutation` (real deletes)
 * and `useCreateMutation`'s undo (a freshly created node is undone by
 * deleting it again, and that undo is redone by restoring it) — both patch
 * the same cache entry and hit the same two procedures, just with different
 * toast/snapshot-capture wrapping around them.
 */
export function makeRawDeleteRestore(
	queryClient: QueryClient,
	queryKey: QueryKey,
) {
	const setRows = makeSetRows(queryClient, queryKey);

	// Silent callers (undo/redo) never surface their own toast — success is
	// handled by undoStore's "Redone" toast, and a failure here just
	// invalidates the cache to reconcile silently. A non-silent (user-
	// initiated) delete instead reports its outcome back to the caller, which
	// wraps the whole operation in a single in-progress toast via
	// `toast.promise`, so this rethrows on failure rather than showing its
	// own error toast.
	const rawDelete = async (id: string, options: { silent?: boolean } = {}) => {
		await queryClient.cancelQueries({ queryKey });
		// Let the row's own exit animation play out before it actually leaves
		// the tree data — otherwise it would unmount instantly, with nothing
		// left to animate. This only delays when the row's own removal (and
		// undo-stack push) lands, never focus or the next command, both of
		// which already happen synchronously in the caller.
		await playRowExit(id);
		setRows((rows) => removeRawSubtree(rows, id));
		try {
			return await client.nodes.delete({ id });
		} catch (error) {
			queryClient.invalidateQueries({ queryKey });
			if (options.silent) return undefined;
			throw error;
		}
	};

	const rawRestore = async (snapshot: DeleteSnapshot) => {
		await queryClient.cancelQueries({ queryKey });
		markRowRestored(snapshot.row.id);
		setRows((rows) => [
			...insertRawRowAt(rows, snapshot.row, snapshot.target),
			...snapshot.descendants,
		]);
		try {
			await client.nodes.restore(toRestoreInput(snapshot));
		} catch {
			toast.error(m.undo_restore_failed());
			queryClient.invalidateQueries({ queryKey });
		}
	};

	return { rawDelete, rawRestore };
}
