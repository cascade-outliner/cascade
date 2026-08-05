import type { CalendarDateString } from "./calendar-date";

/**
 * A local wall-clock time of day as `HH:MM` (24h, zero-padded) — paired
 * with a `CalendarDateString` to turn a day into a specific moment. Node
 * due times are stored and transmitted in this form.
 */
export type CalendarTimeString = string;

const calendarTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidCalendarTimeString(value: string): boolean {
	return calendarTimePattern.test(value);
}

/** Combines a calendar date and time-of-day into a local `Date` instant. */
export function combineDueDateTime(
	dueDate: CalendarDateString,
	dueTime: CalendarTimeString,
): Date {
	const [year, month, day] = dueDate.split("-").map(Number);
	const [hours, minutes] = dueTime.split(":").map(Number);
	return new Date(year, month - 1, day, hours, minutes);
}
