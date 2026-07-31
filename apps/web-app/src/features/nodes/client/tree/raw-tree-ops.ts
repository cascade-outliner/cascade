import type { FlatNodeRow } from "@cascade/outliner/node-types";
import type { MoveTarget } from "@cascade/outliner/visible-rows";
import { generateKeyBetween } from "fractional-indexing";

/**
 * Optimistic-cache primitives for the raw, unordered node list. Since the
 * cache holds every node for the user (not a pre-sorted DFS view), these
 * only ever need to touch `parentId`/`order`/field values — no depth/path
 * bookkeeping — because `buildVisibleTree` recomputes the rendered view
 * fresh from this data on every read.
 */

export function patchRawRow(
	rows: FlatNodeRow[],
	id: string,
	patch: Partial<FlatNodeRow>,
): FlatNodeRow[] {
	return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

function childrenByParent(
	rows: FlatNodeRow[],
): Map<string | null, FlatNodeRow[]> {
	const map = new Map<string | null, FlatNodeRow[]>();
	for (const row of rows) {
		const siblings = map.get(row.parentId);
		if (siblings) siblings.push(row);
		else map.set(row.parentId, [row]);
	}
	return map;
}

/** Every descendant of `id`, in no particular order. */
export function collectDescendants(
	rows: FlatNodeRow[],
	id: string,
): FlatNodeRow[] {
	const byParent = childrenByParent(rows);
	const descendants: FlatNodeRow[] = [];
	const stack = [...(byParent.get(id) ?? [])];
	while (stack.length > 0) {
		// biome-ignore lint/style/noNonNullAssertion: length checked by while
		const row = stack.pop()!;
		descendants.push(row);
		stack.push(...(byParent.get(row.id) ?? []));
	}
	return descendants;
}

/** Ids of `id`'s descendants that are currently visible (not behind a collapsed node). */
export function revealedDescendantIds(
	rows: FlatNodeRow[],
	id: string,
): string[] {
	const byParent = childrenByParent(rows);
	const ids: string[] = [];
	function walk(parentId: string) {
		for (const child of byParent.get(parentId) ?? []) {
			ids.push(child.id);
			if (child.expanded) walk(child.id);
		}
	}
	walk(id);
	return ids;
}

export function removeRawSubtree(
	rows: FlatNodeRow[],
	id: string,
): FlatNodeRow[] {
	const descendantIds = new Set(
		collectDescendants(rows, id).map((row) => row.id),
	);
	return rows.filter((row) => row.id !== id && !descendantIds.has(row.id));
}

/** Mirrors the server's `orderAtTarget` sibling-position resolution, client-side. */
function orderAtRawTarget(
	rows: FlatNodeRow[],
	excludeId: string | null,
	target: MoveTarget,
): string {
	const siblings = rows
		.filter((row) => row.parentId === target.parentId && row.id !== excludeId)
		.sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));

	let before: string | null = null;
	let after: string | null = null;
	if (target.position === "append") {
		before = siblings.at(-1)?.order ?? null;
	} else {
		const index = siblings.findIndex((row) => row.id === target.targetId);
		if (target.position === "before") {
			before = index > 0 ? siblings[index - 1].order : null;
			after = siblings[index]?.order ?? null;
		} else {
			before = siblings[index]?.order ?? null;
			after = siblings[index + 1]?.order ?? null;
		}
	}

	return generateKeyBetween(before, after);
}

/** Moves an existing row to a target sibling position. */
export function moveRawRow(
	rows: FlatNodeRow[],
	id: string,
	target: MoveTarget,
): FlatNodeRow[] {
	const order = orderAtRawTarget(rows, id, target);
	return patchRawRow(rows, id, { parentId: target.parentId, order });
}

/** Inserts a row (not yet present) at a target sibling position. */
export function insertRawRowAt(
	rows: FlatNodeRow[],
	row: FlatNodeRow,
	target: MoveTarget,
): FlatNodeRow[] {
	const order = orderAtRawTarget(rows, null, target);
	return [...rows, { ...row, parentId: target.parentId, order }];
}
