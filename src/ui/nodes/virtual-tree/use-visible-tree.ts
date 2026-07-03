import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRef } from "react";
import type { TypedMetadata } from "@/core/nodes/node-types";
import type { VisibleNodeRow } from "@/core/nodes/node.types";
import { client, orpc } from "@/orpc/client";
import {
	appendRow,
	collapseNode,
	expandNode,
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

	const move = async (id: string, target: MoveTarget) => {
		setRows((rows) => moveSubtree(rows, id, target));
		try {
			await client.nodes.move(
				target.position === "append"
					? { id, parentId: target.parentId, position: "append" }
					: {
							id,
							parentId: target.parentId,
							position: target.position,
							targetId: target.targetId,
						},
			);
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
			await client.nodes.delete({ id });
		} catch {
			invalidate();
		}
	};

	const updateContent = async (id: string, content: { root: unknown }) => {
		setRows((rows) => patchRow(rows, id, { content }));
		try {
			await client.nodes.updateContent({ id, content });
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
		loadMore,
	};
}

export type VisibleTree = ReturnType<typeof useVisibleTree>;
