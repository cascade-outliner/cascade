import type {
	TypedMetadata,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";
import {
	insertSubtreeAt,
	type MoveTarget,
	removeSubtree,
} from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client } from "@/orpc/client";
import { makeSetRows } from "../cache-helpers";

export interface DeleteSnapshot {
	row: VisibleNodeRow;
	descendants: VisibleNodeRow[];
	target: MoveTarget;
}

function toSnapshotInput(row: VisibleNodeRow) {
	return {
		id: row.id,
		content: row.content as { root: unknown } | null,
		expanded: row.expanded,
		dueDate: row.dueDate,
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

	const rawDelete = async (id: string, options: { silent?: boolean } = {}) => {
		await queryClient.cancelQueries({ queryKey });
		setRows((rows) => removeSubtree(rows, id));
		try {
			const { childrenDeleted } = await client.nodes.delete({ id });
			if (!options.silent) {
				toast.success(
					childrenDeleted > 64
						? m.node_deleted_with_many_children()
						: childrenDeleted > 0
							? m.node_deleted_with_children({ count: childrenDeleted })
							: m.node_deleted(),
				);
			}
		} catch {
			toast.error(m.node_delete_failed());
			queryClient.invalidateQueries({ queryKey });
		}
	};

	const rawRestore = async (snapshot: DeleteSnapshot) => {
		await queryClient.cancelQueries({ queryKey });
		setRows((rows) =>
			insertSubtreeAt(
				rows,
				snapshot.row,
				snapshot.descendants,
				snapshot.target,
			),
		);
		try {
			await client.nodes.restore(toRestoreInput(snapshot));
		} catch {
			toast.error(m.undo_restore_failed());
			queryClient.invalidateQueries({ queryKey });
		}
	};

	return { rawDelete, rawRestore };
}
