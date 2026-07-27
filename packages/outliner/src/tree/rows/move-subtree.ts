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
	const range = subtreeRange(rows, sourceId);
	if (!range) return rows;

	const slice = rows.slice(range.start, range.end);
	const oldParentId = slice[0].parentId;
	let remaining = [...rows.slice(0, range.start), ...rows.slice(range.end)];

	const destination = resolveDestination(remaining, target);
	if (!destination) return rows;

	if (destination.parentPatchId) {
		remaining = patchRow(remaining, destination.parentPatchId, {
			hasChildren: true,
		});
	}

	const depthDelta = destination.depth - slice[0].depth;
	const paths = new Map<string, string[]>();
	const parentPath =
		target.parentId === null
			? []
			: (remaining.find((row) => row.id === target.parentId)?.path ?? []);
	const moved = slice.map((row, index) => {
		const path =
			index === 0
				? [...parentPath, row.order]
				: [...(paths.get(row.parentId ?? "") ?? []), row.order];
		paths.set(row.id, path);
		return index === 0
			? {
					...row,
					parentId: target.parentId,
					depth: row.depth + depthDelta,
					path,
				}
			: { ...row, depth: row.depth + depthDelta, path };
	});

	let result = destination.skipInsert
		? remaining
		: [
				...remaining.slice(0, destination.index),
				...moved,
				...remaining.slice(destination.index),
			];

	if (
		oldParentId !== null &&
		oldParentId !== target.parentId &&
		!result.some((row) => row.parentId === oldParentId)
	) {
		result = patchRow(result, oldParentId, {
			hasChildren: false,
			expanded: false,
		});
	}

	return recomputeIsLastChild(result);
}

interface MoveDestination {
	index: number;
	depth: number;
	skipInsert: boolean;
	parentPatchId?: string;
}

function resolveDestination(
	rows: VisibleNodeRow[],
	target: MoveTarget,
): MoveDestination | null {
	if (target.position !== "append") {
		const targetRange = subtreeRange(rows, target.targetId);
		if (!targetRange) return null;
		if (rows[targetRange.start].parentId !== target.parentId) return null;

		return {
			index: target.position === "before" ? targetRange.start : targetRange.end,
			depth: rows[targetRange.start].depth,
			skipInsert: false,
		};
	}

	if (target.parentId === null) {
		return {
			index: rows.length,
			depth: rows.length > 0 ? rows[0].depth : 0,
			skipInsert: false,
		};
	}

	const parentRange = subtreeRange(rows, target.parentId);
	if (!parentRange) return null;

	const parent = rows[parentRange.start];
	return {
		index: parentRange.end,
		depth: parent.depth + 1,
		skipInsert: !parent.expanded,
		parentPatchId: target.parentId,
	};
}
