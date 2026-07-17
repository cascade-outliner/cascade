export interface NodeFilters {
	dueToday: boolean;
	dueThisWeek: boolean;
	hideCompleted: boolean;
}

export const noFilters: NodeFilters = {
	dueToday: false,
	dueThisWeek: false,
	hideCompleted: false,
};

export function hasActiveFilters(filters: NodeFilters): boolean {
	return filters.dueToday || filters.dueThisWeek || filters.hideCompleted;
}
