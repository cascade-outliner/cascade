import { z } from "zod";
import {
	type CalendarDateString,
	isValidCalendarDateString,
} from "./calendar-date";

export const recurrenceUnitSchema = z.enum(["day", "week", "month"]);
export type RecurrenceUnit = z.infer<typeof recurrenceUnitSchema>;

export const recurrenceInputSchema = z.object({
	unit: recurrenceUnitSchema,
	interval: z.number().int().min(1).max(999),
});
export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>;

export const recurrenceRuleSchema = recurrenceInputSchema.extend({
	anchorDay: z.number().int().min(1).max(31),
});
export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

function parts(value: CalendarDateString) {
	if (!isValidCalendarDateString(value))
		throw new Error("Invalid calendar date");
	const [year, month, day] = value.split("-").map(Number);
	return { year, month, day };
}

function formatUtc(date: Date): CalendarDateString {
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${date.getUTCFullYear()}-${month}-${day}`;
}

function monthlyOccurrence(
	dueDate: CalendarDateString,
	rule: RecurrenceRule,
	today: CalendarDateString,
): CalendarDateString {
	const due = parts(dueDate);
	const current = parts(today);
	const dueMonth = due.year * 12 + due.month - 1;
	const currentMonth = current.year * 12 + current.month - 1;
	let steps = Math.max(
		1,
		Math.floor((currentMonth - dueMonth) / rule.interval),
	);

	const occurrence = () => {
		const monthIndex = dueMonth + steps * rule.interval;
		const year = Math.floor(monthIndex / 12);
		const month = monthIndex % 12;
		const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
		return formatUtc(
			new Date(Date.UTC(year, month, Math.min(rule.anchorDay, lastDay))),
		);
	};

	let next = occurrence();
	if (next <= today) {
		steps += 1;
		next = occurrence();
	}
	return next;
}

/** Returns the first scheduled occurrence after today, advancing at least once. */
export function nextRecurringDueDate(
	dueDate: CalendarDateString,
	rule: RecurrenceRule,
	today: CalendarDateString,
): CalendarDateString {
	if (!isValidCalendarDateString(today))
		throw new Error("Invalid calendar date");
	if (rule.unit === "month") return monthlyOccurrence(dueDate, rule, today);

	const due = parts(dueDate);
	const current = parts(today);
	const dueTime = Date.UTC(due.year, due.month - 1, due.day);
	const currentTime = Date.UTC(current.year, current.month - 1, current.day);
	const intervalDays = rule.interval * (rule.unit === "week" ? 7 : 1);
	const intervalMs = intervalDays * 86_400_000;
	const steps = Math.max(
		1,
		Math.floor((currentTime - dueTime) / intervalMs) + 1,
	);
	return formatUtc(new Date(dueTime + steps * intervalMs));
}
