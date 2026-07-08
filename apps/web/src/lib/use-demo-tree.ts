import { toast } from "@cascade/ui/toast";
import { lexicalToPlainText } from "@cascade/ui/tree/lexical-content";
import type { VisibleNodeRow } from "@cascade/ui/tree/node-types";
import type { VisibleTree } from "@cascade/ui/tree/tree-types";
import {
	appendRow,
	insertRowAfter,
	moveSubtree,
	patchRow,
	removeSubtree,
	subtreeRange,
} from "@cascade/ui/tree/visible-rows";
import { useMemo, useState } from "react";
import { demoAllNodes } from "./demo-seed";

function newRow(
	partial: Pick<VisibleNodeRow, "parentId" | "depth" | "isLastChild">,
) {
	const id = crypto.randomUUID();
	const row: VisibleNodeRow = {
		id,
		content: null,
		type: "text",
		metadata: null,
		expanded: false,
		order: id,
		path: [],
		hasChildren: false,
		...partial,
	};
	return row;
}

/**
 * Derives the visible rows for `rootId` from the full node table, mirroring
 * the server's `visibleTree({ rootId })`: children of `rootId` (or top-level
 * nodes when `rootId` is null) down through chains of expanded nodes,
 * re-depthed relative to the root.
 */
function visibleRowsForRoot(
	allNodes: VisibleNodeRow[],
	rootId: string | null,
): VisibleNodeRow[] {
	let scope: VisibleNodeRow[];
	let rootDepth: number;
	if (rootId === null) {
		scope = allNodes;
		rootDepth = -1;
	} else {
		const range = subtreeRange(allNodes, rootId);
		if (!range) return [];
		scope = allNodes.slice(range.start + 1, range.end);
		rootDepth = allNodes[range.start].depth;
	}

	const out: VisibleNodeRow[] = [];
	let skipBelowDepth: number | null = null;
	for (const row of scope) {
		const relDepth = row.depth - rootDepth - 1;
		if (skipBelowDepth !== null) {
			if (relDepth > skipBelowDepth) continue;
			skipBelowDepth = null;
		}
		out.push(relDepth === row.depth ? row : { ...row, depth: relDepth });
		if (!row.expanded) skipBelowDepth = relDepth;
	}
	return out;
}

/**
 * In-memory stand-in for apps/app's use-visible-tree.ts: same VisibleTree
 * contract and the same pure splice helpers, but mutating a local table of
 * every node instead of an oRPC-backed query cache. Nothing here persists or
 * hits a network. Holding the whole tree (not just the current root's visible
 * slice) lets the demo "zoom into" any node instantly, the same way clicking
 * a node's link opens /node/$nodeId in the real app.
 */
export function useDemoTree(rootId: string | null) {
	const [allNodes, setAllNodes] = useState<VisibleNodeRow[]>(demoAllNodes);

	const rows = useMemo(
		() => visibleRowsForRoot(allNodes, rootId),
		[allNodes, rootId],
	);

	const ancestors = useMemo(() => {
		if (rootId === null) return [];
		const chain: { id: string; label: string }[] = [];
		let current = allNodes.find((r) => r.id === rootId);
		while (current) {
			chain.unshift({
				id: current.id,
				label: lexicalToPlainText(current.content) || "Untitled",
			});
			const parentId: string | null = current.parentId;
			current =
				parentId === null ? undefined : allNodes.find((r) => r.id === parentId);
		}
		return chain;
	}, [allNodes, rootId]);

	const toggle: VisibleTree["toggle"] = (
		id,
		expanded,
		commit = (splice) => splice(),
	) => {
		commit(() => setAllNodes((current) => patchRow(current, id, { expanded })));
	};

	const move: VisibleTree["move"] = (id, target, options = {}) => {
		setAllNodes((current) => {
			const withExpandedParent = options.expandParentId
				? patchRow(current, options.expandParentId, { expanded: true })
				: current;
			return moveSubtree(withExpandedParent, id, target);
		});
	};

	const remove: VisibleTree["remove"] = (id, commit = (splice) => splice()) => {
		commit(() => setAllNodes((current) => removeSubtree(current, id)));
		toast.success("Node deleted");
	};

	const updateContent: VisibleTree["updateContent"] = (id, content) => {
		setAllNodes((current) => patchRow(current, id, { content }));
	};

	const setType: VisibleTree["setType"] = (id, typed) => {
		setAllNodes((current) =>
			patchRow(current, id, { type: typed.type, metadata: typed.metadata }),
		);
	};

	const add: VisibleTree["add"] = async (commit = (splice) => splice()) => {
		const parentDepth =
			rootId === null
				? -1
				: (allNodes.find((r) => r.id === rootId)?.depth ?? -1);
		const created = newRow({
			parentId: rootId,
			depth: parentDepth + 1,
			isLastChild: true,
		});
		commit(() =>
			setAllNodes((current) =>
				rootId === null
					? appendRow(current, created)
					: insertRowAfter(current, rootId, created),
			),
		);
		return created.id;
	};

	const addAfter: VisibleTree["addAfter"] = async (
		afterId,
		commit = (splice) => splice(),
	) => {
		const sibling = allNodes.find((r) => r.id === afterId);
		if (!sibling) return add(commit);
		const created = newRow({
			parentId: sibling.parentId,
			depth: sibling.depth,
			isLastChild: sibling.isLastChild,
		});
		commit(() =>
			setAllNodes((current) => insertRowAfter(current, afterId, created)),
		);
		return created.id;
	};

	return {
		rows,
		hasMore: false,
		toggle,
		move,
		remove,
		updateContent,
		setType,
		add,
		addAfter,
		loadMore: () => {},
		ancestors,
	};
}
