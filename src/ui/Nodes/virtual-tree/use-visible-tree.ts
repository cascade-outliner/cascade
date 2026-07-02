import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRef } from "react";
import type { VisibleNodeRow } from "@/core/nodes/node.types";
import { client, orpc } from "@/orpc/client";
import {
	collapseNode,
	expandNode,
	type MoveTarget,
	moveSubtree,
	patchRow,
	removeSubtree,
} from "@/ui/nodes/virtual-tree/visible-rows";

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

	const toggle = async (id: string, expanded: boolean) => {
		if (expanded) {
			setRows((rows) => patchRow(rows, id, { expanded: true }));
			try {
				const subtree = await client.nodes.visibleTree({ rootId: id });
				setRows((rows) => expandNode(rows, id, subtree.rows));
				await client.nodes.toggleExpanded({ id, expanded: true });
			} catch {
				invalidate();
			}
		} else {
			setRows((rows) => collapseNode(rows, id));
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
		opts?: { expandParent?: boolean },
	) => {
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
			if (opts?.expandParent && target.parentId) {
				await client.nodes.toggleExpanded({
					id: target.parentId,
					expanded: true,
				});
			}
		} finally {
			// Server-computed fractional order is authoritative; positions match,
			// so this reconciliation is invisible unless a concurrent edit raced us.
			invalidate();
		}
	};

	const remove = async (id: string) => {
		setRows((rows) => removeSubtree(rows, id));
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
		loadMore,
	};
}

export type VisibleTree = ReturnType<typeof useVisibleTree>;
