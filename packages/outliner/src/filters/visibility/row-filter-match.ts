import { parseCalendarDate } from "../../dates/calendar-date";
import {
	isDueOnDate,
	isDueThisWeek,
	isDueToday,
	startOfDay,
} from "../../dates/due-date-bucket";
import type { VisibleNodeRow } from "../../nodes/model/node-types";
import {
	hasActiveDueDateFilter,
	type NodeFilters,
} from "../model/node-filters";

/** Matches every active positive filter; completion is handled separately. */
export function rowMatchesFilters(
	row: VisibleNodeRow,
	filters: NodeFilters,
): boolean {
	const rowTags = new Set(row.tags.map((tag) => tag.toLowerCase()));
	if (!filters.tags.every((tag) => rowTags.has(tag.toLowerCase()))) {
		return false;
	}

	if (
		filters.priorities.length > 0 &&
		(!row.priority || !filters.priorities.includes(row.priority))
	) {
		return false;
	}

	if (
		filters.statusIds.length > 0 &&
		(!row.status || !filters.statusIds.includes(row.status.id))
	) {
		return false;
	}

	if (!hasActiveDueDateFilter(filters)) return true;
	if (!row.dueDate) return false;

	const dueDate = parseCalendarDate(row.dueDate);
	if (filters.dueToday && !isDueToday(dueDate)) return false;
	if (filters.dueThisWeek && !isDueThisWeek(dueDate)) return false;
	if (filters.dueOnDate && !isDueOnDate(dueDate, filters.dueOnDate)) {
		return false;
	}

	if (filters.dueDateRange) {
		const dueDay = startOfDay(dueDate);
		if (
			dueDay < filters.dueDateRange.start ||
			dueDay > filters.dueDateRange.end
		) {
			return false;
		}
	}

	return true;
}
