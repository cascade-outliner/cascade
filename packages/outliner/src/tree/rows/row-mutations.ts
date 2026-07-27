import type { VisibleNodeRow } from "../../nodes/model/node-types";
import { recomputeIsLastChild, subtreeRange } from "./row-structure";

export function patchRow(
	rows: VisibleNodeRow[],
	id: string,
	patch: Partial<VisibleNodeRow>,
): VisibleNodeRow[] {
	return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

/** Marks a node collapsed and removes its visible descendants. */
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

/** Marks a node expanded and inserts its relatively-depthed subtree. */
export function expandNode(
	rows: VisibleNodeRow[],
	id: string,
	subtree: VisibleNodeRow[],
): VisibleNodeRow[] {
	const range = subtreeRange(rows, id);
	if (!range) return rows;

	const node = rows[range.start];
	const descendants = subtree.map((row) => ({
		...row,
		depth: row.depth + node.depth + 1,
		path: [...node.path, ...row.path],
	}));

	return [
		...rows.slice(0, range.start),
		{
			...node,
			expanded: true,
			hasChildren: node.hasChildren || subtree.length > 0,
		},
		...descendants,
		...rows.slice(range.end),
	];
}

/** Removes a node subtree and repairs its old parent's structural flags. */
export function removeSubtree(
	rows: VisibleNodeRow[],
	id: string,
): VisibleNodeRow[] {
	const range = subtreeRange(rows, id);
	if (!range) return rows;

	const parentId = rows[range.start].parentId;
	let result = [...rows.slice(0, range.start), ...rows.slice(range.end)];
	if (parentId !== null && !result.some((row) => row.parentId === parentId)) {
		result = patchRow(result, parentId, {
			hasChildren: false,
			expanded: false,
		});
	}

	return recomputeIsLastChild(result);
}

export function appendRow(
	rows: VisibleNodeRow[],
	row: VisibleNodeRow,
): VisibleNodeRow[] {
	return recomputeIsLastChild([...rows, row]);
}

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

export function insertSubtreeAfter(
	rows: VisibleNodeRow[],
	afterId: string,
	newRoot: VisibleNodeRow,
	descendants: VisibleNodeRow[],
): VisibleNodeRow[] {
	const range = subtreeRange(rows, afterId);
	if (!range) return appendRow(rows, newRoot);

	const adjustedDescendants = descendants.map((row) => ({
		...row,
		depth: row.depth + newRoot.depth + 1,
		path: [...newRoot.path, ...row.path],
	}));

	return recomputeIsLastChild([
		...rows.slice(0, range.end),
		newRoot,
		...adjustedDescendants,
		...rows.slice(range.end),
	]);
}
