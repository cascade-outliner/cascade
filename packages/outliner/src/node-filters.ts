export interface NodeFilters {
	dueToday: boolean;
	dueThisWeek: boolean;
	/** Show only nodes due on this specific calendar date. */
	dueOnDate: Date | null;
	/** Show only nodes due within this date range (inclusive). */
	dueDateRange: { start: Date; end: Date } | null;
	hideCompleted: boolean;
}

export const noFilters: NodeFilters = {
	dueToday: false,
	dueThisWeek: false,
	dueOnDate: null,
	dueDateRange: null,
	hideCompleted: false,
};

export function hasActiveDueDateFilter(filters: NodeFilters): boolean {
	return (
		filters.dueToday ||
		filters.dueThisWeek ||
		filters.dueOnDate !== null ||
		filters.dueDateRange !== null
	);
}

export function hasActiveFilters(filters: NodeFilters): boolean {
	return hasActiveDueDateFilter(filters) || filters.hideCompleted;
}
