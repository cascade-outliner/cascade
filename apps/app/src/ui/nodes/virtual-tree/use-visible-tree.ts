import { toast } from "@cascade/ui/toast";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRef } from "react";
import type { VisibleNodeRow } from "@/core/nodes/node.types";
import type { TypedMetadata } from "@/core/nodes/node-types";
import { sound } from "@/lib/sound";
import { client, orpc } from "@/orpc/client";
import {
	appendRow,
	collapseNode,
	expandNode,
	insertRowAfter,
	type MoveTarget,
	moveSubtree,
	patchRow,
	removeSubtree,
} from "./visible-rows";

interface VisibleTreeData {
	rows: VisibleNodeRow[];
	nextCursor: string[] | null;
}

export function visibleTreeOptions(rootId: string | null) {
	return orpc.nodes.visibleTree.queryOptions({ input: { rootId } });
}

/**
 * Single owner of the flat visible-tree cache entry and every mutation that
 * touches it. All mutations splice the flat array optimistically, then persist
 * and reconcile with the server (whose fractional order is authoritative).
 */
export function useVisibleTree(rootId: string | null) {
	const queryClient = useQueryClient();
	const options = visibleTreeOptions(rootId);
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

	const toggle = async (
		id: string,
		expanded: boolean,
		commit: (splice: () => void) => void = (splice) => splice(),
	) => {
		if (expanded) {
			setRows((rows) => patchRow(rows, id, { expanded: true }));
			try {
				const subtree = await client.nodes.visibleTree({ rootId: id });
				commit(() => setRows((rows) => expandNode(rows, id, subtree.rows)));
				await client.nodes.toggleExpanded({ id, expanded: true });
			} catch {
				invalidate();
			}
		} else {
			commit(() => setRows((rows) => collapseNode(rows, id)));
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

	const remove = async (
		id: string,
		commit: (splice: () => void) => void = (splice) => splice(),
	) => {
		commit(() => setRows((rows) => removeSubtree(rows, id)));
		try {
			const { childrenDeleted } = await client.nodes.delete({ id });
			sound.play("success");
			toast.success(
				childrenDeleted > 0
					? `Node deleted along with ${childrenDeleted} child node${childrenDeleted === 1 ? "" : "s"}`
					: "Node deleted",
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

	/** Create and append a new node as the last child of this view's root. */
	const add = async (
		commit: (splice: () => void) => void = (splice) => splice(),
	) => {
		const created = await client.nodes.create({ parentId: rootId });
		sound.play("click");
		commit(() =>
			setRows((rows) =>
				appendRow(rows, {
					id: created.id,
					parentId: created.parentId,
					content: created.content,
					type: created.type,
					metadata: created.metadata,
					expanded: created.expanded,
					order: created.order,
					depth: 0,
					path: [created.order],
					hasChildren: created.hasChildren,
					isLastChild: true,
				}),
			),
		);
		return created.id;
	};

	/** Create a new node as the next sibling right after `afterId`. */
	const addAfter = async (
		afterId: string,
		commit: (splice: () => void) => void = (splice) => splice(),
	) => {
		const sibling = data.rows.find((r) => r.id === afterId);
		if (!sibling) return add(commit);
		const created = await client.nodes.create({
			parentId: sibling.parentId,
			afterId,
		});
		sound.play("click");
		commit(() =>
			setRows((rows) =>
				insertRowAfter(rows, afterId, {
					id: created.id,
					parentId: created.parentId,
					content: created.content,
					type: created.type,
					metadata: created.metadata,
					expanded: created.expanded,
					order: created.order,
					depth: sibling.depth,
					path: [...sibling.path.slice(0, -1), created.order],
					hasChildren: created.hasChildren,
					isLastChild: sibling.isLastChild,
				}),
			),
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
		add,
		addAfter,
		loadMore,
	};
}

export type VisibleTree = ReturnType<typeof useVisibleTree>;
