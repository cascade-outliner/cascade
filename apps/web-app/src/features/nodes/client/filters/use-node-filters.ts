import {
	formatCalendarDate,
	isValidCalendarDateString,
	parseCalendarDate,
} from "@cascade/outliner/calendar-date";
import type { NodeFilters } from "@cascade/outliner/node-filters";
import { PRIORITY_NAMES } from "@cascade/outliner/node-priority";
import {
	createParser,
	parseAsArrayOf,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";

/**
 * A calendar date as `YYYY-MM-DD` in the URL, parsed in local time (the
 * built-in ISO parser works in UTC, which can shift the day for the user).
 */
const parseAsLocalDate = createParser<Date>({
	parse(value) {
		return isValidCalendarDateString(value) ? parseCalendarDate(value) : null;
	},
	serialize: formatCalendarDate,
	eq: (a, b) => a.getTime() === b.getTime(),
});

const filterParsers = {
	tag: parseAsArrayOf(parseAsString).withDefault([]),
	priority: parseAsArrayOf(parseAsStringLiteral(PRIORITY_NAMES)).withDefault(
		[],
	),
	status: parseAsArrayOf(parseAsString).withDefault([]),
	filter: parseAsStringLiteral(["today", "week"]),
	due: parseAsLocalDate,
	due_start: parseAsLocalDate,
	due_end: parseAsLocalDate,
	completed: parseAsStringLiteral(["hidden", "visible"]),
};

export type CompletedFilterOverride = "hidden" | "visible" | null;

export function resolveHideCompleted(
	override: CompletedFilterOverride,
	defaultValue: boolean,
): boolean {
	if (override === "hidden") return true;
	if (override === "visible") return false;
	return defaultValue;
}

export function completedFilterOverride(
	hideCompleted: boolean,
	defaultValue: boolean,
): CompletedFilterOverride {
	if (hideCompleted === defaultValue) return null;
	return hideCompleted ? "hidden" : "visible";
}

/** Outliner filter state, synced to the URL so a filtered view is shareable/bookmarkable. */
export function useNodeFilters(
	hideCompletedByDefault = false,
): [NodeFilters, (filters: NodeFilters) => void] {
	const [
		{ tag, priority, status, filter, due, due_start, due_end, completed },
		setQueryFilters,
	] = useQueryStates(filterParsers);

	const dueDateRange =
		due_start !== null && due_end !== null && due_start <= due_end
			? { start: due_start, end: due_end }
			: null;

	return [
		{
			tags: tag,
			priorities: priority,
			statusIds: status,
			dueToday: filter === "today",
			dueThisWeek: filter === "week",
			dueOnDate: due,
			dueDateRange,
			hideCompleted: resolveHideCompleted(completed, hideCompletedByDefault),
		},
		(filters) =>
			setQueryFilters({
				tag: filters.tags.length > 0 ? filters.tags : null,
				priority: filters.priorities.length > 0 ? filters.priorities : null,
				status: filters.statusIds.length > 0 ? filters.statusIds : null,
				filter: filters.dueToday
					? "today"
					: filters.dueThisWeek
						? "week"
						: null,
				due: filters.dueOnDate,
				due_start: filters.dueDateRange?.start ?? null,
				due_end: filters.dueDateRange?.end ?? null,
				completed: completedFilterOverride(
					filters.hideCompleted,
					hideCompletedByDefault,
				),
			}),
	];
}
