import {
	type CalendarDateString,
	parseCalendarDate,
} from "@cascade/outliner/calendar-date";
import { startOfDay, startOfWeek } from "@cascade/outliner/due-date-bucket";
import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import type { FlatNodeRow } from "@cascade/outliner/node-types";

export type AgendaSectionKind = "overdue" | "today" | "this-week" | "upcoming";

export interface AgendaRow extends FlatNodeRow {
	title: string;
}

export interface AgendaDayGroup {
	date: CalendarDateString;
	rows: AgendaRow[];
}

export interface AgendaSection {
	kind: AgendaSectionKind;
	days: AgendaDayGroup[];
}

const SECTION_ORDER: AgendaSectionKind[] = [
	"overdue",
	"today",
	"this-week",
	"upcoming",
];

function isCompletedTask(row: FlatNodeRow): boolean {
	return row.type === "task" && (row.metadata?.completed ?? false);
}

function sectionForDate(date: Date, today: Date): AgendaSectionKind {
	if (date < today) return "overdue";
	if (date.getTime() === today.getTime()) return "today";
	const weekStart = startOfWeek(today);
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);
	return date < weekEnd ? "this-week" : "upcoming";
}

/**
 * Groups every dated node into Overdue/Today/This Week/Upcoming sections,
 * each holding one day group per distinct due date, ascending. Completed
 * tasks are dropped when `hideCompleted` is set; other node types with a
 * due date are always included (due-date filtering elsewhere in the app
 * already treats `dueDate` as type-agnostic).
 */
export function buildAgendaGroups(
	rows: FlatNodeRow[],
	{ hideCompleted }: { hideCompleted: boolean },
): AgendaSection[] {
	const today = startOfDay(new Date());
	const byDate = new Map<CalendarDateString, AgendaRow[]>();

	for (const row of rows) {
		if (!row.dueDate) continue;
		if (hideCompleted && isCompletedTask(row)) continue;
		const list = byDate.get(row.dueDate) ?? [];
		list.push({ ...row, title: lexicalToPlainText(row.content) });
		byDate.set(row.dueDate, list);
	}

	const days = [...byDate.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, dayRows]) => ({
			date,
			rows: dayRows.sort((a, b) => a.title.localeCompare(b.title)),
		}));

	const sections = new Map<AgendaSectionKind, AgendaDayGroup[]>();
	for (const day of days) {
		const kind = sectionForDate(parseCalendarDate(day.date), today);
		const existing = sections.get(kind) ?? [];
		existing.push(day);
		sections.set(kind, existing);
	}

	return SECTION_ORDER.filter((kind) => sections.has(kind)).map((kind) => ({
		kind,
		days: sections.get(kind) ?? [],
	}));
}
