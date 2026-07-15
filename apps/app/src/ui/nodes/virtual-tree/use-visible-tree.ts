import { startOfDay } from "@cascade/outliner/due-date-bucket";
import {
	insertMissingSubtreeRows,
	removeNonMatchDescendants,
} from "@cascade/outliner/filter-visibility";
import type {
	TypedMetadata,
	VisibleNodeRow,
} from "@cascade/outliner/node-types";
import type { AddNodeOptions, VisibleTree } from "@cascade/outliner/tree-types";
import {
	appendRow,
	collapseNode,
	expandNode,
	insertRowAfter,
	type MoveTarget,
	moveSubtree,
	patchRow,
	removeSubtree,
} from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { m } from "#/paraglide/messages.js";
import { client, orpc } from "@/orpc/client";

interface VisibleTreeData {
	rows: VisibleNodeRow[];
	nextCursor: string[] | null;
}

export function visibleTreeOptions(
	rootId: string | null,
	filter: "today" | null = null,
) {
	// Stable for the whole calendar day, so the query key (and cache) doesn't
	// change on every render; the server matches "today" against this bound.
	const localDayStart = filter === "today" ? startOfDay(new Date()) : null;
	return orpc.nodes.visibleTree.queryOptions({
		input: { rootId, filter, localDayStart },
	});
}

/**
 * Single owner of the flat visible-tree cache entry and every mutation that
 * touches it. All mutations splice the flat array optimistically, then persist
 * and reconcile with the server (whose fractional order is authoritative).
 *
 * `filter: "today"` fetches only the nodes due today anywhere in this node's
 * subtree, computed server-side independent of collapse state, so the filter
 * can match nodes hidden inside collapsed sections instead of just what's
 * already loaded.
 */
export function useVisibleTree(
	rootId: string | null,
	filter: "today" | null = null,
): VisibleTree {
	const queryClient = useQueryClient();
	const options = visibleTreeOptions(rootId, filter);
	const { data } = useSuspenseQuery(options);
	const loadingMore = useRef(false);

	const setRows = (fn: (rows: VisibleNodeRow[]) => VisibleNodeRow[]) => {
		queryClient.setQueryData(
			options.queryKey,
			(old: VisibleTreeData | undefined) =>
				old ? { ...old, rows: fn(old.rows) } : old,
		);
	};

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: options.queryKey });

	// Under the due-today filter, tree.rows only holds matches (found anywhere
	// in the subtree regardless of collapse state) - a node's real children can
	// already include some of those matches, sitting wherever their own path
	// puts them, without having been "expanded" into view. Splicing by depth
	// range (as expandNode/collapseNode do) would treat those as part of the
	// range being replaced and silently drop them, so use the id-based variants
	// instead, which only add rows that are missing and only remove rows that
	// aren't themselves still due today.
	const toggle = async (id: string, expanded: boolean) => {
		if (expanded) {
			setRows((rows) => patchRow(rows, id, { expanded: true }));
			try {
				const subtree = await client.nodes.visibleTree({ rootId: id });
				setRows((rows) =>
					filter === "today"
						? insertMissingSubtreeRows(rows, id, subtree.rows)
						: expandNode(rows, id, subtree.rows),
				);
				await client.nodes.toggleExpanded({ id, expanded: true });
			} catch {
				invalidate();
			}
		} else {
			setRows((rows) =>
				filter === "today"
					? removeNonMatchDescendants(rows, id)
					: collapseNode(rows, id),
			);
			try {
				await client.nodes.toggleExpanded({ id, expanded: false });
			} catch {
				invalidate();
			}
		}
	};

	const move = async (
		id: string,
		target: MoveTarget,
		options: { expandParentId?: string } = {},
	) => {
		const { expandParentId } = options;
		setRows((rows) => {
			const expanded = expandParentId
				? patchRow(rows, expandParentId, { expanded: true })
				: rows;
			return moveSubtree(expanded, id, target);
		});
		try {
			await Promise.all([
				client.nodes.move(
					target.position === "append"
						? { id, parentId: target.parentId, position: "append" }
						: {
								id,
								parentId: target.parentId,
								position: target.position,
								targetId: target.targetId,
							},
				),
				expandParentId
					? client.nodes.toggleExpanded({ id: expandParentId, expanded: true })
					: null,
			]);
		} finally {
			// Server-computed fractional order is authoritative; positions match,
			// so this reconciliation is invisible unless a concurrent edit raced us.
			invalidate();
		}
	};

	const remove = async (id: string) => {
		setRows((rows) => removeSubtree(rows, id));
		try {
			const { childrenDeleted } = await client.nodes.delete({ id });
			toast.success(
				childrenDeleted > 0
					? m.node_deleted_with_children({ count: childrenDeleted })
					: m.node_deleted(),
			);
		} catch {
			invalidate();
		}
	};

	const updateContent = async (id: string, content: { root: unknown }) => {
		setRows((rows) => patchRow(rows, id, { content }));
		try {
			await client.nodes.updateContent({ id, content });

			// Bust breadcrumbs to refresh its data
			queryClient.invalidateQueries({ queryKey: orpc.nodes.ancestors.key() });
		} catch {
			invalidate();
		}
	};

	/** Convert a node's type or update its per-type metadata (e.g. task completion). */
	const setType = async (id: string, typed: TypedMetadata) => {
		setRows((rows) =>
			patchRow(rows, id, { type: typed.type, metadata: typed.metadata }),
		);
		try {
			await client.nodes.setType({ id, ...typed });
		} catch {
			invalidate();
		}
	};

	const setDueDate = async (id: string, dueDate: Date | null) => {
		setRows((rows) => patchRow(rows, id, { dueDate }));
		try {
			await client.nodes.setDueDate({ id, dueDate });
		} catch {
			invalidate();
		}
	};

	/** Create and append a new node as the last child of this view's root. */
	const add = async ({ dueDate = null }: AddNodeOptions = {}) => {
		const created = await client.nodes.create({ parentId: rootId, dueDate });
		setRows((rows) =>
			appendRow(rows, {
				id: created.id,
				parentId: created.parentId,
				content: created.content,
				type: created.type,
				metadata: created.metadata,
				expanded: created.expanded,
				order: created.order,
				dueDate: created.dueDate,
				depth: 0,
				path: [created.order],
				hasChildren: created.hasChildren,
				isLastChild: true,
			}),
		);
		return created.id;
	};

	/** Create a new node as the next sibling right after `afterId`. */
	const addAfter = async (afterId: string, options: AddNodeOptions = {}) => {
		const { dueDate = null } = options;
		const sibling = data.rows.find((r) => r.id === afterId);
		if (!sibling) return add(options);
		const created = await client.nodes.create({
			parentId: sibling.parentId,
			afterId,
			dueDate,
		});
		setRows((rows) =>
			insertRowAfter(rows, afterId, {
				id: created.id,
				parentId: created.parentId,
				content: created.content,
				type: created.type,
				metadata: created.metadata,
				expanded: created.expanded,
				order: created.order,
				dueDate: created.dueDate,
				depth: sibling.depth,
				path: [...sibling.path.slice(0, -1), created.order],
				hasChildren: created.hasChildren,
				isLastChild: sibling.isLastChild,
			}),
		);
		return created.id;
	};

	const loadMore = async () => {
		if (loadingMore.current || !data.nextCursor) return;
		loadingMore.current = true;
		try {
			const next = await client.nodes.visibleTree({
				rootId,
				cursor: data.nextCursor,
			});
			queryClient.setQueryData(
				options.queryKey,
				(old: VisibleTreeData | undefined) =>
					old
						? { rows: [...old.rows, ...next.rows], nextCursor: next.nextCursor }
						: old,
			);
		} finally {
			loadingMore.current = false;
		}
	};

	return {
		rows: data.rows,
		hasMore: data.nextCursor !== null,
		toggle,
		move,
		remove,
		updateContent,
		setType,
		setDueDate,
		add,
		addAfter,
		loadMore,
	};
}
