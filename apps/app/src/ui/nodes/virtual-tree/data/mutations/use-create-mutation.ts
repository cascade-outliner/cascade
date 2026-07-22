import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { AddNodeOptions } from "@cascade/outliner/tree-types";
import {
	appendRow,
	insertRowAfter,
	type MoveTarget,
} from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { client } from "@/orpc/client";
import { undoStore } from "@/ui/undo/undo-store";
import { makeSetRows } from "../cache-helpers";
import type { VisibleTreeData } from "../types";
import { makeRawDeleteRestore } from "./raw-delete-restore";

/**
 * Owns both "append as last child of root" (`add`) and "insert after a
 * sibling" (`addAfter`), since both just place a freshly created node into
 * the flat row array with the same visible-tree bookkeeping (depth/path).
 */
export function useCreateMutation(
	queryKey: QueryKey,
	rootId: string | null,
	rows: VisibleTreeData["rows"],
) {
	const queryClient = useQueryClient();
	const setRows = makeSetRows(queryClient, queryKey);
	const { rawDelete, rawRestore } = makeRawDeleteRestore(queryClient, queryKey);

	const mutation = useMutation({
		mutationFn: (vars: {
			parentId: string | null;
			afterId?: string;
			dueDate?: string | null;
		}) => client.nodes.create(vars),
	});

	// A freshly created node is always a childless leaf, so undoing it is a
	// plain delete and redoing that undo is a plain restore — the same
	// primitives `useRemoveMutation` uses, just with no descendants to snapshot.
	const pushCreateUndo = (
		row: VisibleTreeData["rows"][number],
		target: MoveTarget,
	) => {
		undoStore.push({
			undo: () => rawDelete(row.id, { silent: true }),
			redo: () => rawRestore({ row, descendants: [], target }),
		});
	};

	const add = async ({ dueDate = null }: AddNodeOptions = {}) => {
		let created: Awaited<ReturnType<typeof mutation.mutateAsync>>;
		try {
			created = await mutation.mutateAsync({
				parentId: rootId,
				dueDate: dueDate ? formatCalendarDate(dueDate) : null,
			});
		} catch {
			toast.error(m.node_create_failed());
			return null;
		}

		const row = {
			id: created.id,
			parentId: created.parentId,
			content: created.content,
			type: created.type,
			metadata: created.metadata,
			expanded: created.expanded,
			order: created.order,
			dueDate: created.dueDate,
			tags: created.tags,
			depth: 0,
			path: [created.order],
			hasChildren: created.hasChildren,
			isLastChild: true,
		};
		await queryClient.cancelQueries({ queryKey });
		setRows((currentRows) => appendRow(currentRows, row));
		pushCreateUndo(row, { position: "append", parentId: rootId });
		return created.id;
	};

	const addAfter = async (afterId: string, addOptions: AddNodeOptions = {}) => {
		const { dueDate = null } = addOptions;
		const liveRows =
			queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows ?? rows;
		const sibling = liveRows.find((r) => r.id === afterId);
		if (!sibling) return add(addOptions);

		let created: Awaited<ReturnType<typeof mutation.mutateAsync>>;
		try {
			created = await mutation.mutateAsync({
				parentId: sibling.parentId,
				afterId,
				dueDate: dueDate ? formatCalendarDate(dueDate) : null,
			});
		} catch {
			toast.error(m.node_create_failed());
			return null;
		}
		const row = {
			id: created.id,
			parentId: created.parentId,
			content: created.content,
			type: created.type,
			metadata: created.metadata,
			expanded: created.expanded,
			order: created.order,
			dueDate: created.dueDate,
			tags: created.tags,
			depth: sibling.depth,
			path: [...sibling.path.slice(0, -1), created.order],
			hasChildren: created.hasChildren,
			isLastChild: sibling.isLastChild,
		};
		await queryClient.cancelQueries({ queryKey });
		setRows((currentRows) => insertRowAfter(currentRows, afterId, row));
		pushCreateUndo(row, {
			position: "after",
			targetId: afterId,
			parentId: sibling.parentId,
		});
		return created.id;
	};

	return { add, addAfter };
}
