import { dueBucket, isDueThisWeek } from "../due-date-bucket";
import { hasActiveFilters, type NodeFilters } from "../node-filters";
import type { VisibleNodeRow } from "../node-types";
import { subtreeRange } from "./visible-rows";

export interface RowVisibility {
	/** Row ids to hide entirely: not a match, and not on the path to one. */
	hiddenIds: Set<string>;
	/** Row ids to keep visible but dimmed: a match's ancestors or descendants. */
	contextIds: Set<string>;
}

const emptyVisibility: RowVisibility = {
	hiddenIds: new Set(),
	contextIds: new Set(),
};

/**
 * Resolves which rows an active filter set hides. Matches, their full
 * ancestor chain, and their full descendant subtree stay in the array at
 * their original depth, so indent, outdent, and drag-and-drop keep
 * operating on the same contiguous rows they always have; only rendering
 * treats hidden/context rows differently.
 *
 * "Hide completed" is an exclusion rather than a match: completed tasks and
 * their entire subtrees are dropped up front, and any due-date filters then
 * match over what remains. On its own it dims nothing — every surviving row
 * stays fully visible.
 */
export function getRowVisibility(
	rows: VisibleNodeRow[],
	filters: NodeFilters,
): RowVisibility {
	if (!hasActiveFilters(filters)) return emptyVisibility;

	const excludedIds = filters.hideCompleted
		? getCompletedSubtreeIds(rows)
		: new Set<string>();

	if (!filters.dueToday && !filters.dueThisWeek) {
		return { hiddenIds: excludedIds, contextIds: new Set() };
	}

	// Excluded subtrees never surface again, not even as dimmed context, so
	// the due-date filters only consider the remaining rows. An excluded row
	// can't be a candidate's ancestor: exclusion always covers whole subtrees.
	const candidates = rows.filter((row) => !excludedIds.has(row.id));
	const parentById = new Map(candidates.map((row) => [row.id, row.parentId]));
	const matchIds = new Set(
		candidates
			.filter((row) => rowMatchesFilters(row, filters))
			.map((row) => row.id),
	);

	const contextIds = new Set<string>();
	for (const id of matchIds) {
		let parentId = parentById.get(id) ?? null;
		while (
			parentId !== null &&
			!matchIds.has(parentId) &&
			!contextIds.has(parentId)
		) {
			contextIds.add(parentId);
			parentId = parentById.get(parentId) ?? null;
		}

		// A matched node's own descendants stay visible too, even if they
		// don't individually match, so its subtree isn't cut off mid-tree.
		const range = subtreeRange(rows, id);
		if (range) {
			for (let i = range.start + 1; i < range.end; i++) {
				const descendantId = rows[i].id;
				if (!matchIds.has(descendantId) && !excludedIds.has(descendantId)) {
					contextIds.add(descendantId);
				}
			}
		}
	}

	const hiddenIds = new Set(
		rows
			.filter((row) => !matchIds.has(row.id) && !contextIds.has(row.id))
			.map((row) => row.id),
	);

	return { hiddenIds, contextIds };
}

/** A completed task hides its whole subtree with it. */
function getCompletedSubtreeIds(rows: VisibleNodeRow[]): Set<string> {
	const excluded = new Set<string>();
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (excluded.has(row.id) || !isCompletedTask(row)) continue;
		let end = i + 1;
		while (end < rows.length && rows[end].depth > row.depth) end++;
		for (let j = i; j < end; j++) excluded.add(rows[j].id);
	}
	return excluded;
}

function isCompletedTask(row: VisibleNodeRow): boolean {
	return row.type === "task" && (row.metadata?.completed ?? false);
}

/** A row matches when it satisfies every active due-date filter. */
function rowMatchesFilters(row: VisibleNodeRow, filters: NodeFilters): boolean {
	if (!row.dueDate) return false;
	const completed = isCompletedTask(row);
	if (
		filters.dueToday &&
		dueBucket(new Date(row.dueDate), completed) !== "today"
	) {
		return false;
	}
	if (filters.dueThisWeek && !isDueThisWeek(new Date(row.dueDate), completed)) {
		return false;
	}
	return true;
}
