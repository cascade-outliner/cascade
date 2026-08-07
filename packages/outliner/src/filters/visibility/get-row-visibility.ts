import type { VisibleNodeRow } from "../../nodes/model/node-types";
import { hasActiveFilters, type NodeFilters } from "../model/node-filters";
import { rowMatchesFilters } from "./row-filter-match";
import {
	getCollapsedDescendantIds,
	getCompletedSubtreeIds,
	getMatchDescendantIds,
} from "./subtree-visibility";

export interface RowVisibility {
	/** Row ids to hide entirely: not a match, and not on the path to one. */
	hiddenIds: Set<string>;
	/** Row ids to keep visible but dimmed: a match's ancestors or descendants. */
	contextIds: Set<string>;
	/** Row ids with children loaded in `rows` that are all filtered out, so
	 * expanding would reveal nothing — their expand chevron shouldn't show. */
	noVisibleChildrenIds: Set<string>;
}

const emptyVisibility: RowVisibility = {
	hiddenIds: new Set(),
	contextIds: new Set(),
	noVisibleChildrenIds: new Set(),
};

/**
 * Resolves filtering without changing the flat row array, preserving tree
 * depth and contiguous-subtree semantics for keyboard and drag operations.
 */
export function getRowVisibility(
	rows: VisibleNodeRow[],
	filters: NodeFilters,
): RowVisibility {
	if (!hasActiveFilters(filters)) return emptyVisibility;

	const excludedIds = filters.hideCompleted
		? getCompletedSubtreeIds(rows)
		: new Set<string>();

	if (!hasPositiveFilters(filters)) {
		return {
			hiddenIds: excludedIds,
			contextIds: new Set(),
			noVisibleChildrenIds: collectNoVisibleChildrenIds(rows, excludedIds),
		};
	}

	const candidates = rows.filter((row) => !excludedIds.has(row.id));
	const parentById = new Map(candidates.map((row) => [row.id, row.parentId]));
	const matchIds = new Set(
		candidates
			.filter((row) => rowMatchesFilters(row, filters))
			.map((row) => row.id),
	);
	const collapsedIds = getCollapsedDescendantIds(candidates);
	const contextIds = collectContextIds(candidates, matchIds, parentById);

	// Filtered-out, independent of collapse state: a collapsed match's hidden
	// children must still count as "visible if expanded" for the chevron.
	const filteredOutIds = new Set(
		rows
			.filter((row) => !matchIds.has(row.id) && !contextIds.has(row.id))
			.map((row) => row.id),
	);

	const hiddenIds = new Set(
		rows
			.filter((row) => collapsedIds.has(row.id) || filteredOutIds.has(row.id))
			.map((row) => row.id),
	);

	return {
		hiddenIds,
		contextIds,
		noVisibleChildrenIds: collectNoVisibleChildrenIds(rows, filteredOutIds),
	};
}

/**
 * Direct parent ids whose children are all present in `rows` (i.e. loaded,
 * not just collapsed-and-unfetched) but every one of them is filtered out.
 */
function collectNoVisibleChildrenIds(
	rows: VisibleNodeRow[],
	filteredOutIds: Set<string>,
): Set<string> {
	const childrenByParent = new Map<string, VisibleNodeRow[]>();
	for (const row of rows) {
		if (row.parentId === null) continue;
		const siblings = childrenByParent.get(row.parentId);
		if (siblings) siblings.push(row);
		else childrenByParent.set(row.parentId, [row]);
	}

	const noVisibleChildrenIds = new Set<string>();
	for (const [parentId, children] of childrenByParent) {
		if (children.every((child) => filteredOutIds.has(child.id))) {
			noVisibleChildrenIds.add(parentId);
		}
	}
	return noVisibleChildrenIds;
}

function hasPositiveFilters(filters: NodeFilters): boolean {
	return !(
		filters.tags.length === 0 &&
		filters.priorities.length === 0 &&
		filters.statusIds.length === 0 &&
		!filters.dueToday &&
		!filters.dueThisWeek &&
		!filters.dueOnDate &&
		!filters.dueDateRange
	);
}

function collectContextIds(
	rows: VisibleNodeRow[],
	matchIds: Set<string>,
	parentById: Map<string, string | null>,
): Set<string> {
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

	for (const id of getMatchDescendantIds(rows, matchIds)) {
		if (!matchIds.has(id)) contextIds.add(id);
	}

	return contextIds;
}
