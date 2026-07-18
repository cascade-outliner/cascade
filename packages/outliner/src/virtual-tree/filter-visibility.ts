import { isDueOnDate, isDueThisWeek, isDueToday } from "../due-date-bucket";
import { hasActiveFilters, type NodeFilters } from "../node-filters";
import type { VisibleNodeRow } from "../node-types";

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
 * Resolves which rows an active filter set hides. Matches and their ancestor
 * chain stay in the array at their original depth, so indent, outdent, and
 * drag-and-drop keep operating on the same contiguous rows they always have;
 * only rendering treats hidden/context rows differently.
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

	if (
		!filters.dueToday &&
		!filters.dueThisWeek &&
		!filters.dueOnDate &&
		!filters.dueDateRange
	) {
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
	const collapsedIds = getCollapsedDescendantIds(candidates);

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
	}

	const hiddenIds = new Set(
		rows
			.filter(
				(row) =>
					collapsedIds.has(row.id) ||
					(!matchIds.has(row.id) && !contextIds.has(row.id)),
			)
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

/** Descendants of a collapsed node stay hidden, even if they match a filter. */
function getCollapsedDescendantIds(rows: VisibleNodeRow[]): Set<string> {
	const hidden = new Set<string>();
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (row.expanded || !row.hasChildren) continue;
		let end = i + 1;
		while (end < rows.length && rows[end].depth > row.depth) end++;
		for (let j = i + 1; j < end; j++) hidden.add(rows[j].id);
	}
	return hidden;
}

/**
 * A row matches when it satisfies every active due-date filter, regardless
 * of completion status — "Hide completed" is the only filter that excludes
 * completed tasks, so a due-date filter must still match one that's done.
 */
function rowMatchesFilters(row: VisibleNodeRow, filters: NodeFilters): boolean {
	if (!row.dueDate) return false;
	const dueDate = new Date(row.dueDate);
	if (filters.dueToday && !isDueToday(dueDate)) {
		return false;
	}
	if (filters.dueThisWeek && !isDueThisWeek(dueDate)) {
		return false;
	}
	if (filters.dueOnDate && !isDueOnDate(dueDate, filters.dueOnDate)) {
		return false;
	}
	if (filters.dueDateRange) {
		const { start, end } = filters.dueDateRange;
		if (dueDate < start || dueDate > end) {
			return false;
		}
	}
	return true;
}
