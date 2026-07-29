import type { VisibleNodeRow } from "../../nodes/model/node-types";
import type { MoveTarget } from "./move-targets";
import { patchRow } from "./row-mutations";
import { recomputeIsLastChild, subtreeRange } from "./row-structure";

/** Reinserts a removed subtree at a captured move target. */
export function insertSubtreeAt(
	rows: VisibleNodeRow[],
	newRoot: VisibleNodeRow,
	descendants: VisibleNodeRow[],
	target: MoveTarget,
): VisibleNodeRow[] {
	const appended = recomputeIsLastChild([
		...rows,
		{ ...newRoot, parentId: null, depth: 0 },
		...descendants.map((row) => ({ ...row, depth: row.depth + 1 })),
	]);
	return moveSubtree(appended, newRoot.id, target);
}

/**
 * Moves a visible subtree and repairs depths and parent structural flags.
 * This mirrors the server's move semantics for optimistic updates.
 */
export function moveSubtree(
	rows: VisibleNodeRow[],
	sourceId: string,
	target: MoveTarget,
): VisibleNodeRow[] {
	const extracted = extractSubtree(rows, sourceId);
	if (!extracted) return rows;
	const { subtreeRows, oldParentId, rowsWithoutSubtree } = extracted;

	const destination = resolveDestination(rowsWithoutSubtree, target);
	if (!destination) return rows;

	let result = destination.parentPatchId
		? patchRow(rowsWithoutSubtree, destination.parentPatchId, {
				hasChildren: true,
			})
		: rowsWithoutSubtree;

	const relocatedSubtree = relocateSubtree(
		subtreeRows,
		result,
		target,
		destination,
	);
	result = destination.skipInsert
		? result
		: insertRowsAt(result, relocatedSubtree, destination.index);

	result = clearParentIfNowChildless(result, oldParentId, target.parentId);

	return recomputeIsLastChild(result);
}

/** Whether applying a target would change the source row's parent or visible sibling slot. */
export function moveWouldChangePosition(
	rows: VisibleNodeRow[],
	sourceId: string,
	target: MoveTarget,
): boolean {
	const moved = moveSubtree(rows, sourceId, target);
	return moved.some(
		(row, index) =>
			row.id !== rows[index]?.id || row.parentId !== rows[index]?.parentId,
	);
}

interface ExtractedSubtree {
	/** The moved row and its contiguous visible descendants, in original order. */
	subtreeRows: VisibleNodeRow[];
	oldParentId: string | null;
	/** `rows` with the subtree removed, in original order. */
	rowsWithoutSubtree: VisibleNodeRow[];
}

/** Slices a row and its contiguous visible descendants out of the flat row list. */
function extractSubtree(
	rows: VisibleNodeRow[],
	sourceId: string,
): ExtractedSubtree | null {
	const range = subtreeRange(rows, sourceId);
	if (!range) return null;

	const subtreeRows = rows.slice(range.start, range.end);
	return {
		subtreeRows,
		oldParentId: subtreeRows[0].parentId,
		rowsWithoutSubtree: [
			...rows.slice(0, range.start),
			...rows.slice(range.end),
		],
	};
}

/**
 * Rewrites the moved subtree's parentId (root row only), depth, and path
 * array for its new position. `rowsAtDestination` is used to look up the new
 * parent's path, so it must already reflect any parent-flag patch (path is
 * unaffected by that patch, but depth/order lookups must stay consistent).
 */
function relocateSubtree(
	subtreeRows: VisibleNodeRow[],
	rowsAtDestination: VisibleNodeRow[],
	target: MoveTarget,
	destination: MoveDestination,
): VisibleNodeRow[] {
	const subtreeRoot = subtreeRows[0];
	const depthDelta = destination.depth - subtreeRoot.depth;
	const newParentPath =
		target.parentId === null
			? []
			: (rowsAtDestination.find((row) => row.id === target.parentId)?.path ??
				[]);

	const pathById = new Map<string, string[]>();
	return subtreeRows.map((row, index) => {
		const isSubtreeRoot = index === 0;
		const parentPath = isSubtreeRoot
			? newParentPath
			: (pathById.get(row.parentId ?? "") ?? []);
		const path = [...parentPath, row.order];
		pathById.set(row.id, path);

		return isSubtreeRoot
			? {
					...row,
					parentId: target.parentId,
					depth: row.depth + depthDelta,
					path,
				}
			: { ...row, depth: row.depth + depthDelta, path };
	});
}

function insertRowsAt(
	rows: VisibleNodeRow[],
	rowsToInsert: VisibleNodeRow[],
	index: number,
): VisibleNodeRow[] {
	return [...rows.slice(0, index), ...rowsToInsert, ...rows.slice(index)];
}

/**
 * Collapses and un-expands the old parent once it has no children left, e.g.
 * after its only child moved away to a different parent.
 */
function clearParentIfNowChildless(
	rows: VisibleNodeRow[],
	oldParentId: string | null,
	newParentId: string | null,
): VisibleNodeRow[] {
	if (oldParentId === null || oldParentId === newParentId) return rows;
	if (rows.some((row) => row.parentId === oldParentId)) return rows;

	return patchRow(rows, oldParentId, { hasChildren: false, expanded: false });
}

interface MoveDestination {
	index: number;
	depth: number;
	/** Collapsed target parent: the row wouldn't be visible, so skip inserting it. */
	skipInsert: boolean;
	/** Set when appending into a parent, so it can be flagged `hasChildren: true`. */
	parentPatchId?: string;
}

function resolveDestination(
	rows: VisibleNodeRow[],
	target: MoveTarget,
): MoveDestination | null {
	if (target.position !== "append")
		return resolveSiblingDestination(rows, target);
	if (target.parentId === null) return resolveRootAppendDestination(rows);
	return resolveChildAppendDestination(rows, target.parentId);
}

/** Position immediately before or after an existing sibling row. */
function resolveSiblingDestination(
	rows: VisibleNodeRow[],
	target: Extract<MoveTarget, { position: "before" | "after" }>,
): MoveDestination | null {
	const siblingRange = subtreeRange(rows, target.targetId);
	if (!siblingRange) return null;
	if (rows[siblingRange.start].parentId !== target.parentId) return null;

	return {
		index: target.position === "before" ? siblingRange.start : siblingRange.end,
		depth: rows[siblingRange.start].depth,
		skipInsert: false,
	};
}

/** Appended as the last root-level row. */
function resolveRootAppendDestination(rows: VisibleNodeRow[]): MoveDestination {
	return {
		index: rows.length,
		depth: rows.length > 0 ? rows[0].depth : 0,
		skipInsert: false,
	};
}

/** Appended as a parent's last child. */
function resolveChildAppendDestination(
	rows: VisibleNodeRow[],
	parentId: string,
): MoveDestination | null {
	const parentRange = subtreeRange(rows, parentId);
	if (!parentRange) return null;

	const parent = rows[parentRange.start];
	return {
		index: parentRange.end,
		depth: parent.depth + 1,
		skipInsert: !parent.expanded,
		parentPatchId: parentId,
	};
}
