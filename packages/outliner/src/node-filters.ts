export interface NodeFilters {
	dueToday: boolean;
	dueThisWeek: boolean;
	/** Show only nodes due on this specific calendar date. */
	dueOnDate: Date | null;
	hideCompleted: boolean;
}

export const noFilters: NodeFilters = {
	dueToday: false,
	dueThisWeek: false,
	dueOnDate: null,
	hideCompleted: false,
};

export function hasActiveFilters(filters: NodeFilters): boolean {
	return (
		filters.dueToday ||
		filters.dueThisWeek ||
		filters.dueOnDate !== null ||
		filters.hideCompleted
	);
}
