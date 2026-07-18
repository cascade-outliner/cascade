import type { NodeFilters } from "@cascade/outliner/node-filters";
import { createParser, parseAsStringLiteral, useQueryStates } from "nuqs";

/**
 * A calendar date as `YYYY-MM-DD` in the URL, parsed in local time (the
 * built-in ISO parser works in UTC, which can shift the day for the user).
 */
const parseAsLocalDate = createParser<Date>({
	parse(value) {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
		if (!match) return null;
		const date = new Date(
			Number(match[1]),
			Number(match[2]) - 1,
			Number(match[3]),
		);
		return Number.isNaN(date.getTime()) ? null : date;
	},
	serialize(date) {
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${date.getFullYear()}-${month}-${day}`;
	},
	eq: (a, b) => a.getTime() === b.getTime(),
});

const filterParsers = {
	filter: parseAsStringLiteral(["today", "week"]),
	due: parseAsLocalDate,
	due_start: parseAsLocalDate,
	due_end: parseAsLocalDate,
	completed: parseAsStringLiteral(["hidden"]),
};

/** Outliner filter state, synced to the URL so a filtered view is shareable/bookmarkable. */
export function useNodeFilters(): [
	NodeFilters,
	(filters: NodeFilters) => void,
] {
	const [{ filter, due, due_start, due_end, completed }, setQueryFilters] =
		useQueryStates(filterParsers);

	const dueDateRange =
		due_start !== null && due_end !== null && due_start <= due_end
			? { start: due_start, end: due_end }
			: null;

	return [
		{
			dueToday: filter === "today",
			dueThisWeek: filter === "week",
			dueOnDate: due,
			dueDateRange,
			hideCompleted: completed === "hidden",
		},
		(filters) =>
			setQueryFilters({
				filter: filters.dueToday
					? "today"
					: filters.dueThisWeek
						? "week"
						: null,
				due: filters.dueOnDate,
				due_start: filters.dueDateRange?.start ?? null,
				due_end: filters.dueDateRange?.end ?? null,
				completed: filters.hideCompleted ? "hidden" : null,
			}),
	];
}
