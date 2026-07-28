import type { VisibleNodeRow } from "../../nodes/model/node-types";

/** A completed task excludes itself and its entire subtree. */
export function getCompletedSubtreeIds(rows: VisibleNodeRow[]): Set<string> {
	const excluded = new Set<string>();

	for (let index = 0; index < rows.length; index++) {
		const row = rows[index];
		if (excluded.has(row.id) || !isCompletedTask(row)) continue;

		const end = findSubtreeEnd(rows, index);
		for (let current = index; current < end; current++) {
			excluded.add(rows[current].id);
		}
	}

	return excluded;
}

/** Descendants of positive matches remain visible as contextual rows. */
export function getMatchDescendantIds(
	rows: VisibleNodeRow[],
	matchIds: Set<string>,
): Set<string> {
	const descendants = new Set<string>();

	for (let index = 0; index < rows.length; index++) {
		if (!matchIds.has(rows[index].id)) continue;

		const end = findSubtreeEnd(rows, index);
		for (let current = index + 1; current < end; current++) {
			descendants.add(rows[current].id);
		}
	}

	return descendants;
}

/** Descendants of collapsed nodes stay hidden even when they match. */
export function getCollapsedDescendantIds(rows: VisibleNodeRow[]): Set<string> {
	const hidden = new Set<string>();

	for (let index = 0; index < rows.length; index++) {
		const row = rows[index];
		if (hidden.has(row.id) || row.expanded || !row.hasChildren) continue;

		const end = findSubtreeEnd(rows, index);
		for (let current = index + 1; current < end; current++) {
			hidden.add(rows[current].id);
		}
	}

	return hidden;
}

/** Ids of rows that are currently completed tasks (not their descendants). */
export function getCompletedTaskIds(rows: VisibleNodeRow[]): Set<string> {
	const completed = new Set<string>();
	for (const row of rows) {
		if (isCompletedTask(row)) completed.add(row.id);
	}
	return completed;
}

function isCompletedTask(row: VisibleNodeRow): boolean {
	return row.type === "task" && (row.metadata?.completed ?? false);
}

function findSubtreeEnd(rows: VisibleNodeRow[], start: number): number {
	const depth = rows[start].depth;
	let end = start + 1;
	while (end < rows.length && rows[end].depth > depth) end++;
	return end;
}
