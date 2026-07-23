import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import type { AddNodeOptions, VisibleTree } from "@cascade/outliner/tree-types";
import {
	appendRow,
	insertRowAfter,
	moveSubtree,
	patchRow,
	recomputeIsLastChild,
	removeSubtree,
	subtreeRange,
} from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import { useMemo, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { demoAllNodes } from "./demo-seed";

function newRow(
	partial: Pick<VisibleNodeRow, "parentId" | "depth" | "isLastChild"> &
		Partial<Pick<VisibleNodeRow, "dueDate">>,
) {
	const id = crypto.randomUUID();
	const row: VisibleNodeRow = {
		id,
		content: null,
		type: "text",
		metadata: null,
		expanded: false,
		order: id,
		dueDate: null,
		tags: [],
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
 * In-memory stand-in for apps/web-app's virtual-tree/data/use-visible-tree.ts:
 * same VisibleTree
 * contract and the same pure splice helpers, but mutating a local table of
 * every node instead of an oRPC-backed query cache. Nothing here persists or
 * hits a network. Holding the whole tree (not just the current root's visible
 * slice) lets the demo "zoom into" any node instantly, the same way clicking
 * a node's link opens /$nodeSlug in the real app.
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
				label: lexicalToPlainText(current.content) || m.untitled_node(),
			});
			const parentId: string | null = current.parentId;
			current =
				parentId === null ? undefined : allNodes.find((r) => r.id === parentId);
		}
		return chain;
	}, [allNodes, rootId]);

	const toggle: VisibleTree["toggle"] = (id, expanded) => {
		setAllNodes((current) => patchRow(current, id, { expanded }));
	};

	const move: VisibleTree["move"] = (id, target, options = {}) => {
		setAllNodes((current) => {
			const withExpandedParent = options.expandParentId
				? patchRow(current, options.expandParentId, { expanded: true })
				: current;
			return moveSubtree(withExpandedParent, id, target);
		});
	};

	const remove: VisibleTree["remove"] = (id) => {
		setAllNodes((current) => removeSubtree(current, id));
		toast.success(m.node_deleted());
	};

	const duplicate: VisibleTree["duplicate"] = (id) => {
		setAllNodes((current) => {
			const range = subtreeRange(current, id);
			if (!range) return current;
			const slice = current.slice(range.start, range.end);
			const idMap = new Map(slice.map((row) => [row.id, crypto.randomUUID()]));
			const cloned = slice.map((row) => ({
				...row,
				id: idMap.get(row.id) as string,
				parentId:
					row.id === id
						? row.parentId
						: (idMap.get(row.parentId as string) ?? row.parentId),
			}));
			return recomputeIsLastChild([
				...current.slice(0, range.end),
				...cloned,
				...current.slice(range.end),
			]);
		});
		toast.success(m.node_duplicated());
	};

	const updateContent: VisibleTree["updateContent"] = (id, content) => {
		setAllNodes((current) => patchRow(current, id, { content }));
	};

	const setType: VisibleTree["setType"] = (id, typed) => {
		setAllNodes((current) =>
			patchRow(current, id, { type: typed.type, metadata: typed.metadata }),
		);
	};

	const setDueDate: VisibleTree["setDueDate"] = (id, dueDate) => {
		setAllNodes((current) =>
			patchRow(current, id, {
				dueDate: dueDate ? formatCalendarDate(dueDate) : null,
			}),
		);
	};

	const setTags: VisibleTree["setTags"] = (id, tags) => {
		setAllNodes((current) => patchRow(current, id, { tags }));
	};

	const add: VisibleTree["add"] = async ({
		dueDate = null,
	}: AddNodeOptions = {}) => {
		const parentDepth =
			rootId === null
				? -1
				: (allNodes.find((r) => r.id === rootId)?.depth ?? -1);
		const created = newRow({
			parentId: rootId,
			depth: parentDepth + 1,
			isLastChild: true,
			dueDate: dueDate ? formatCalendarDate(dueDate) : null,
		});
		setAllNodes((current) =>
			rootId === null
				? appendRow(current, created)
				: insertRowAfter(current, rootId, created),
		);
		return created.id;
	};

	const addAfter: VisibleTree["addAfter"] = async (afterId, options = {}) => {
		const { dueDate = null } = options;
		const sibling = allNodes.find((r) => r.id === afterId);
		if (!sibling) return add(options);
		const created = newRow({
			parentId: sibling.parentId,
			depth: sibling.depth,
			isLastChild: sibling.isLastChild,
			dueDate: dueDate ? formatCalendarDate(dueDate) : null,
		});
		setAllNodes((current) => insertRowAfter(current, afterId, created));
		return created.id;
	};

	return {
		rows,
		hasMore: false,
		toggle,
		move,
		remove,
		duplicate,
		updateContent,
		setType,
		setDueDate,
		setTags,
		add,
		addAfter,
		loadMore: () => {},
		ancestors,
	};
}
