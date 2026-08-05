import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { FlatNodeRow } from "@cascade/outliner/node-types";
import { describe, expect, it } from "vitest";
import { buildAgendaGroups } from "./build-agenda-groups";

function daysFromToday(offset: number) {
	const date = new Date();
	date.setDate(date.getDate() + offset);
	return formatCalendarDate(date);
}

function lexicalContent(text: string) {
	return {
		root: {
			type: "root" as const,
			children: [
				{
					type: "paragraph" as const,
					children: [{ type: "text" as const, text }],
				},
			],
		},
	};
}

function row(overrides: Partial<FlatNodeRow>): FlatNodeRow {
	return {
		id: crypto.randomUUID(),
		parentId: null,
		content: lexicalContent("Untitled row"),
		type: "text",
		metadata: null,
		expanded: false,
		order: "a0",
		dueDate: null,
		recurrence: null,
		tags: [],
		icon: null,
		...overrides,
	};
}

describe("buildAgendaGroups", () => {
	it("returns nothing for rows with no due date", () => {
		expect(buildAgendaGroups([row({})], { hideCompleted: true })).toEqual([]);
	});

	it("buckets rows into overdue/today/this-week/upcoming sections", () => {
		const overdue = row({
			content: lexicalContent("Overdue task"),
			dueDate: daysFromToday(-2),
		});
		const today = row({
			content: lexicalContent("Today task"),
			dueDate: daysFromToday(0),
		});
		const thisWeek = row({
			content: lexicalContent("This week task"),
			dueDate: daysFromToday(3),
		});
		const upcoming = row({
			content: lexicalContent("Upcoming task"),
			dueDate: daysFromToday(30),
		});

		const sections = buildAgendaGroups([upcoming, thisWeek, today, overdue], {
			hideCompleted: true,
		});

		expect(sections.map((s) => s.kind)).toEqual([
			"overdue",
			"today",
			"this-week",
			"upcoming",
		]);
		expect(sections[0]?.days[0]?.rows[0]?.title).toBe("Overdue task");
		expect(sections[1]?.days[0]?.rows[0]?.title).toBe("Today task");
	});

	it("gives each overdue day its own group", () => {
		const rows = [
			row({ content: lexicalContent("A"), dueDate: daysFromToday(-1) }),
			row({ content: lexicalContent("B"), dueDate: daysFromToday(-5) }),
		];

		const [overdueSection] = buildAgendaGroups(rows, { hideCompleted: true });

		expect(overdueSection?.kind).toBe("overdue");
		expect(overdueSection?.days).toHaveLength(2);
		expect(overdueSection?.days.map((d) => d.date)).toEqual([
			daysFromToday(-5),
			daysFromToday(-1),
		]);
	});

	it("excludes completed tasks when hideCompleted is true, includes them otherwise", () => {
		const completedTask = row({
			content: lexicalContent("Done task"),
			type: "task",
			metadata: { completed: true },
			dueDate: daysFromToday(0),
		});

		expect(buildAgendaGroups([completedTask], { hideCompleted: true })).toEqual(
			[],
		);

		const shown = buildAgendaGroups([completedTask], { hideCompleted: false });
		expect(shown[0]?.days[0]?.rows[0]?.title).toBe("Done task");
	});

	it("includes non-task nodes with a due date", () => {
		const dated = row({
			content: lexicalContent("Dated note"),
			type: "text",
			dueDate: daysFromToday(0),
		});

		const sections = buildAgendaGroups([dated], { hideCompleted: true });
		expect(sections[0]?.days[0]?.rows[0]?.title).toBe("Dated note");
	});

	it("sorts rows within a day alphabetically by title", () => {
		const rows = [
			row({ content: lexicalContent("Zebra"), dueDate: daysFromToday(0) }),
			row({ content: lexicalContent("Apple"), dueDate: daysFromToday(0) }),
		];

		const [section] = buildAgendaGroups(rows, { hideCompleted: true });
		expect(section?.days[0]?.rows.map((r) => r.title)).toEqual([
			"Apple",
			"Zebra",
		]);
	});
});
