import { startOfDay, startOfWeek } from "../../dates/due-date-bucket";
import type { NodeCapabilityId } from "../../features/model/node-capabilities";
import type { PriorityName } from "../../nodes/model/node-priority";

export interface DueDateRange {
	start: Date;
	end: Date;
}

export interface NodeFilters {
	/** Show only nodes carrying every selected tag. */
	tags: string[];
	/** Show only nodes at one of these priority levels; empty means any. */
	priorities: PriorityName[];
	/** Show only nodes in one of these statuses (by id); empty means any. */
	statusIds: string[];
	dueToday: boolean;
	dueThisWeek: boolean;
	/** Show only nodes due on this specific calendar date. */
	dueOnDate: Date | null;
	/** Show only nodes due within this date range (inclusive). */
	dueDateRange: DueDateRange | null;
	hideCompleted: boolean;
}

export const noFilters: NodeFilters = {
	tags: [],
	priorities: [],
	statusIds: [],
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

/** The inclusive calendar-day bounds represented by the active due-date filter. */
export function activeDueDateRange(
	filters: NodeFilters,
	now = new Date(),
): DueDateRange | null {
	if (filters.dueToday) {
		const today = startOfDay(now);
		return { start: today, end: today };
	}
	if (filters.dueThisWeek) {
		const start = startOfWeek(now);
		const end = new Date(start);
		end.setDate(end.getDate() + 6);
		return { start, end };
	}
	if (filters.dueOnDate) {
		const date = startOfDay(filters.dueOnDate);
		return { start: date, end: date };
	}
	return filters.dueDateRange;
}

export function hasActiveFilters(filters: NodeFilters): boolean {
	return (
		filters.tags.length > 0 ||
		filters.priorities.length > 0 ||
		filters.statusIds.length > 0 ||
		hasActiveDueDateFilter(filters) ||
		filters.hideCompleted
	);
}

export function filtersForCapabilities(
	filters: NodeFilters,
	capabilities: ReadonlySet<NodeCapabilityId>,
): NodeFilters {
	return {
		...filters,
		tags: capabilities.has("tags") ? filters.tags : [],
		priorities: capabilities.has("priority") ? filters.priorities : [],
		statusIds: capabilities.has("status") ? filters.statusIds : [],
		dueToday: capabilities.has("due-date") && filters.dueToday,
		dueThisWeek: capabilities.has("due-date") && filters.dueThisWeek,
		dueOnDate: capabilities.has("due-date") ? filters.dueOnDate : null,
		dueDateRange: capabilities.has("due-date") ? filters.dueDateRange : null,
		hideCompleted: capabilities.has("task") && filters.hideCompleted,
	};
}
