import type { VisibleNodeRow } from "../../nodes/model/node-types";

/**
 * Rows eligible for keyboard focus/move navigation — excludes rows hidden by
 * an active filter, which are `display:none` and out of the tab order (see
 * `VirtualTreeRowProps.isHidden`).
 */
export function navigableRows(
	rows: VisibleNodeRow[],
	hiddenRowIds: Set<string> | undefined,
): VisibleNodeRow[] {
	return hiddenRowIds?.size
		? rows.filter((row) => !hiddenRowIds.has(row.id))
		: rows;
}

/** The row Shift+ArrowUp/Down should move focus to, skipping hidden rows. */
export function findFocusNeighbor(
	rows: VisibleNodeRow[],
	id: string,
	direction: 1 | -1,
): VisibleNodeRow | null {
	const index = rows.findIndex((row) => row.id === id);
	if (index === -1) return null;
	return rows[index + direction] ?? null;
}

/** The row that should receive focus after deleting an empty row, skipping
 * hidden rows. */
export function findDeleteEmptyFocusTarget(
	rows: VisibleNodeRow[],
	id: string,
): VisibleNodeRow | null {
	const index = rows.findIndex((row) => row.id === id);
	return (index > 0 ? rows[index - 1] : null) ?? rows[index + 1] ?? null;
}
