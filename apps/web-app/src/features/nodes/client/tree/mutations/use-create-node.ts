import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import { markRowEntering } from "@cascade/outliner/row-lifecycle-motion";
import type { AddNodeOptions } from "@cascade/outliner/tree-types";
import type { MoveTarget } from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { m } from "#/paraglide/messages.js";
import { undoStore } from "@/features/nodes/client/undo/undo-store";
import { client } from "@/orpc/client";
import { makeSetRows } from "../cache-helpers";
import type { VisibleTreeData } from "../tree-data.types";
import { makeRawDeleteRestore } from "./delete-restore";

/**
 * Owns both "append as last child of root" (`add`) and "insert after a
 * sibling" (`addAfter`): the server already computes the correct
 * `parentId`/`order` for the new node, so both just push its raw row into
 * the shared cache.
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
			initialType?: AddNodeOptions["initialType"];
			dueDate?: string | null;
			tags?: string[];
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
			undo: async () => {
				await rawDelete(row.id, { silent: true });
			},
			redo: () => rawRestore({ row, descendants: [], target }),
		});
	};

	const add = async ({
		initialType,
		dueDate = null,
		tags,
	}: AddNodeOptions = {}) => {
		let created: Awaited<ReturnType<typeof mutation.mutateAsync>>;
		try {
			created = await mutation.mutateAsync({
				parentId: rootId,
				initialType,
				dueDate: dueDate ? formatCalendarDate(dueDate) : null,
				tags,
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
			recurrence: created.recurrence,
			icon: created.icon,
			tags: created.tags,
		};
		await queryClient.cancelQueries({ queryKey });
		markRowEntering(row.id);
		setRows((currentRows) => [...currentRows, row]);
		pushCreateUndo(row, { position: "append", parentId: rootId });
		return created.id;
	};

	const addAfter = async (afterId: string, addOptions: AddNodeOptions = {}) => {
		const { initialType, dueDate = null, tags } = addOptions;
		const liveRows =
			queryClient.getQueryData<VisibleTreeData>(queryKey)?.rows ?? rows;
		const sibling = liveRows.find((r) => r.id === afterId);
		if (!sibling) return add(addOptions);

		let created: Awaited<ReturnType<typeof mutation.mutateAsync>>;
		try {
			created = await mutation.mutateAsync({
				parentId: sibling.parentId,
				afterId,
				initialType,
				dueDate: dueDate ? formatCalendarDate(dueDate) : null,
				tags,
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
			recurrence: created.recurrence,
			icon: created.icon,
			tags: created.tags,
		};
		await queryClient.cancelQueries({ queryKey });
		markRowEntering(row.id);
		setRows((currentRows) => [...currentRows, row]);
		pushCreateUndo(row, {
			position: "after",
			targetId: afterId,
			parentId: sibling.parentId,
		});
		return created.id;
	};

	return { add, addAfter };
}
