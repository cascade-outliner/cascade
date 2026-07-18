import type { VisibleNodeRow } from "../node-types";

/**
 * Pure splice helpers for the flat visible-rows array. Every function returns
 * a new array; none touch the DOM or the query cache. Kept pure so the tricky
 * index math is trivially testable.
 */

/**
 * Contiguous slice for a node and its visible descendants:
 * rows[start] is the node itself, rows[start+1..end) are its descendants
 * (every following row with a greater depth).
 */
export function subtreeRange(
	rows: VisibleNodeRow[],
	id: string,
): { start: number; end: number } | null {
	const start = rows.findIndex((r) => r.id === id);
	if (start === -1) return null;
	const depth = rows[start].depth;
	let end = start + 1;
	while (end < rows.length && rows[end].depth > depth) end++;
	return { start, end };
}

/**
 * Recompute isLastChild for every row in one backwards pass: a row is the
 * last visible child of its parent if no later row shares its parent.
 * Note: with an unloaded pagination tail this can mark the last *loaded*
 * sibling as last; only the drop-hitbox mode depends on it, so that is
 * acceptable until the tail loads.
 */
function recomputeIsLastChild(rows: VisibleNodeRow[]): VisibleNodeRow[] {
	const seen = new Set<string | null>();
	const out = new Array<VisibleNodeRow>(rows.length);
	for (let i = rows.length - 1; i >= 0; i--) {
		const row = rows[i];
		const isLast = !seen.has(row.parentId);
		seen.add(row.parentId);
		out[i] = row.isLastChild === isLast ? row : { ...row, isLastChild: isLast };
	}
	return out;
}

export function patchRow(
	rows: VisibleNodeRow[],
	id: string,
	patch: Partial<VisibleNodeRow>,
): VisibleNodeRow[] {
	return rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

/** Collapse: mark the node collapsed and drop its visible descendants. */
export function collapseNode(
	rows: VisibleNodeRow[],
	id: string,
): VisibleNodeRow[] {
	const range = subtreeRange(rows, id);
	if (!range) return rows;
	return [
		...rows.slice(0, range.start),
		{ ...rows[range.start], expanded: false },
		...rows.slice(range.end),
	];
}

/**
 * Expand: mark the node expanded and splice in its subtree rows (as returned
 * by visibleTree({ rootId: id }), i.e. with depths relative to the node).
 */
export function expandNode(
	rows: VisibleNodeRow[],
	id: string,
	subtree: VisibleNodeRow[],
): VisibleNodeRow[] {
	const range = subtreeRange(rows, id);
	if (!range) return rows;
	const node = rows[range.start];
	const reDepthed = subtree.map((r) => ({
		...r,
		depth: r.depth + node.depth + 1,
	}));
	return [
		...rows.slice(0, range.start),
		{
			...node,
			expanded: true,
			hasChildren: node.hasChildren || subtree.length > 0,
		},
		...reDepthed,
		...rows.slice(range.end),
	];
}

/** Delete a node and its visible descendants; repair the old parent's flags. */
export function removeSubtree(
	rows: VisibleNodeRow[],
	id: string,
): VisibleNodeRow[] {
	const range = subtreeRange(rows, id);
	if (!range) return rows;
	const parentId = rows[range.start].parentId;
	let out = [...rows.slice(0, range.start), ...rows.slice(range.end)];
	if (parentId !== null && !out.some((r) => r.parentId === parentId)) {
		out = patchRow(out, parentId, { hasChildren: false, expanded: false });
	}
	return recomputeIsLastChild(out);
}

/** Append a freshly created root node to the end of the flat list. */
export function appendRow(
	rows: VisibleNodeRow[],
	row: VisibleNodeRow,
): VisibleNodeRow[] {
	return recomputeIsLastChild([...rows, row]);
}

/** Insert a freshly created node as the next sibling right after `afterId`'s subtree. */
export function insertRowAfter(
	rows: VisibleNodeRow[],
	afterId: string,
	row: VisibleNodeRow,
): VisibleNodeRow[] {
	const range = subtreeRange(rows, afterId);
	if (!range) return appendRow(rows, row);
	return recomputeIsLastChild([
		...rows.slice(0, range.end),
		row,
		...rows.slice(range.end),
	]);
}

export type MoveTarget =
	| { position: "before" | "after"; targetId: string; parentId: string | null }
	| { position: "append"; parentId: string | null };

/** Indent target: become the last child of the previous sibling, if any. */
export function findIndentTarget(
	rows: VisibleNodeRow[],
	id: string,
): MoveTarget | null {
	const index = rows.findIndex((r) => r.id === id);
	if (index === -1) return null;
	const depth = rows[index].depth;
	for (let i = index - 1; i >= 0; i--) {
		if (rows[i].depth < depth) return null;
		if (rows[i].depth === depth) {
			return { position: "append", parentId: rows[i].id };
		}
	}
	return null;
}

/** Outdent target: become the next sibling of the current parent, if any. */
export function findOutdentTarget(
	rows: VisibleNodeRow[],
	id: string,
): MoveTarget | null {
	const row = rows.find((r) => r.id === id);
	if (!row || row.parentId === null) return null;
	const parent = rows.find((r) => r.id === row.parentId);
	if (!parent) return null;
	return { position: "after", targetId: parent.id, parentId: parent.parentId };
}

/**
 * Move-up target: swap places with the previous sibling, if any. This is the
 * keyboard equivalent of dragging a row above its previous sibling — the
 * pointer-only "reorder-above" drop instruction in row-drag-drop.tsx.
 */
export function findMoveUpTarget(
	rows: VisibleNodeRow[],
	id: string,
): MoveTarget | null {
	const index = rows.findIndex((r) => r.id === id);
	if (index === -1) return null;
	const row = rows[index];
	for (let i = index - 1; i >= 0; i--) {
		if (rows[i].depth < row.depth) return null;
		if (rows[i].depth === row.depth) {
			return rows[i].parentId === row.parentId
				? { position: "before", targetId: rows[i].id, parentId: row.parentId }
				: null;
		}
	}
	return null;
}

/**
 * Move-down target: swap places with the next sibling, if any. Keyboard
 * equivalent of dragging a row below its next sibling.
 */
export function findMoveDownTarget(
	rows: VisibleNodeRow[],
	id: string,
): MoveTarget | null {
	const range = subtreeRange(rows, id);
	if (!range) return null;
	const row = rows[range.start];
	const next = rows[range.end];
	if (!next || next.depth !== row.depth || next.parentId !== row.parentId) {
		return null;
	}
	return { position: "after", targetId: next.id, parentId: row.parentId };
}

/**
 * 1-indexed position among visible siblings, for `aria-posinset`/`aria-setsize`.
 * Scans only the local run of rows deeper than this row's siblings, not the
 * whole tree.
 */
export function siblingPosition(
	rows: VisibleNodeRow[],
	id: string,
): { posInSet: number; setSize: number } | null {
	const index = rows.findIndex((r) => r.id === id);
	if (index === -1) return null;
	const row = rows[index];
	let posInSet = 1;
	for (let i = index - 1; i >= 0; i--) {
		if (rows[i].depth < row.depth) break;
		if (rows[i].depth === row.depth && rows[i].parentId === row.parentId) {
			posInSet++;
		}
	}
	let setSize = posInSet;
	for (let i = index + 1; i < rows.length; i++) {
		if (rows[i].depth < row.depth) break;
		if (rows[i].depth === row.depth && rows[i].parentId === row.parentId) {
			setSize++;
		}
	}
	return { posInSet, setSize };
}

/**
 * Move a node (and its visible descendants) to a new location, re-depthing
 * the slice and repairing parent flags. Mirrors the server's moveNode
 * semantics so the optimistic result matches the refetched truth.
 */
export function moveSubtree(
	rows: VisibleNodeRow[],
	sourceId: string,
	target: MoveTarget,
): VisibleNodeRow[] {
	const range = subtreeRange(rows, sourceId);
	if (!range) return rows;
	const slice = rows.slice(range.start, range.end);
	const oldParentId = slice[0].parentId;
	let rest = [...rows.slice(0, range.start), ...rows.slice(range.end)];

	let insertAt: number;
	let newDepth: number;
	let skipInsert = false;

	if (target.position === "append") {
		if (target.parentId === null) {
			insertAt = rest.length;
			newDepth = rest.length > 0 ? rest[0].depth : 0;
		} else {
			const parentRange = subtreeRange(rest, target.parentId);
			if (!parentRange) return rows;
			insertAt = parentRange.end;
			newDepth = rest[parentRange.start].depth + 1;
			// A collapsed parent keeps its children hidden: mark it as having
			// children without splicing the moved rows into the visible list.
			skipInsert = !rest[parentRange.start].expanded;
			rest = patchRow(rest, target.parentId, { hasChildren: true });
		}
	} else {
		const targetRange = subtreeRange(rest, target.targetId);
		if (!targetRange) return rows;
		newDepth = rest[targetRange.start].depth;
		insertAt =
			target.position === "before" ? targetRange.start : targetRange.end;
	}

	const depthDelta = newDepth - slice[0].depth;
	const moved = slice.map((r, i) =>
		i === 0
			? { ...r, parentId: target.parentId, depth: r.depth + depthDelta }
			: { ...r, depth: r.depth + depthDelta },
	);

	let out = skipInsert
		? rest
		: [...rest.slice(0, insertAt), ...moved, ...rest.slice(insertAt)];
	if (
		oldParentId !== null &&
		oldParentId !== target.parentId &&
		!out.some((r) => r.parentId === oldParentId)
	) {
		out = patchRow(out, oldParentId, { hasChildren: false, expanded: false });
	}
	return recomputeIsLastChild(out);
}
