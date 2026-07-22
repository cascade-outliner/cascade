import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import {
	isDueOnDate,
	isDueThisWeek,
	startOfWeek,
} from "@cascade/outliner/due-date-bucket";
import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { activeDueDateRange, noFilters } from "@cascade/outliner/node-filters";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Wednesday; the surrounding week runs Monday July 13 through Sunday July 19.
const wednesday = new Date(2026, 6, 15, 12, 0, 0);

function row(
	id: string,
	parentId: string | null,
	depth: number,
	dueDate: Date | null,
	metadata: VisibleNodeRow["metadata"] = { completed: false },
): VisibleNodeRow {
	return {
		id,
		parentId,
		content: null,
		type: "task",
		metadata,
		expanded: true,
		order: id,
		dueDate: dueDate ? formatCalendarDate(dueDate) : null,
		tags: [],
		depth,
		path: [id],
		hasChildren: false,
		isLastChild: false,
	};
}

function taggedRow(
	id: string,
	parentId: string | null,
	depth: number,
	tags: string[],
): VisibleNodeRow {
	return { ...row(id, parentId, depth, null), tags };
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(wednesday);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("startOfWeek", () => {
	it("returns the Monday of the containing week", () => {
		expect(startOfWeek(wednesday)).toEqual(new Date(2026, 6, 13));
	});

	it("keeps a Monday on itself and pulls a Sunday back six days", () => {
		expect(startOfWeek(new Date(2026, 6, 13, 8))).toEqual(
			new Date(2026, 6, 13),
		);
		expect(startOfWeek(new Date(2026, 6, 19, 23))).toEqual(
			new Date(2026, 6, 13),
		);
	});
});

describe("activeDueDateRange", () => {
	it("converts today, this week, and an exact date to inclusive bounds", () => {
		expect(
			activeDueDateRange({ ...noFilters, dueToday: true }, wednesday),
		).toEqual({ start: new Date(2026, 6, 15), end: new Date(2026, 6, 15) });
		expect(
			activeDueDateRange({ ...noFilters, dueThisWeek: true }, wednesday),
		).toEqual({ start: new Date(2026, 6, 13), end: new Date(2026, 6, 19) });
		expect(
			activeDueDateRange({
				...noFilters,
				dueOnDate: new Date(2026, 6, 17, 18),
			}),
		).toEqual({ start: new Date(2026, 6, 17), end: new Date(2026, 6, 17) });
	});
});

describe("isDueThisWeek", () => {
	it("matches dates from Monday through Sunday of the current week", () => {
		expect(isDueThisWeek(new Date(2026, 6, 13))).toBe(true);
		expect(isDueThisWeek(new Date(2026, 6, 15))).toBe(true);
		expect(isDueThisWeek(new Date(2026, 6, 19, 23, 59))).toBe(true);
	});

	it("rejects dates outside the current week", () => {
		expect(isDueThisWeek(new Date(2026, 6, 12))).toBe(false);
		expect(isDueThisWeek(new Date(2026, 6, 20))).toBe(false);
	});
});

describe("getRowVisibility with dueThisWeek", () => {
	const friday = new Date(2026, 6, 17);
	const nextMonday = new Date(2026, 6, 20);

	it("hides everything when no filter is active", () => {
		const rows = [row("a", null, 0, friday), row("b", null, 0, null)];
		const visibility = getRowVisibility(rows, noFilters);
		expect(visibility.hiddenIds.size).toBe(0);
		expect(visibility.contextIds.size).toBe(0);
	});

	it("keeps rows due this week and hides the rest", () => {
		const rows = [
			row("due-friday", null, 0, friday),
			row("due-next-week", null, 0, nextMonday),
			row("no-due-date", null, 0, null),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueThisWeek: true,
		});
		expect(visibility.hiddenIds).toEqual(
			new Set(["due-next-week", "no-due-date"]),
		);
	});

	it("keeps ancestors of a match visible as context", () => {
		const rows = [
			row("parent", null, 0, null),
			row("child", "parent", 1, friday),
			row("other", null, 0, null),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueThisWeek: true,
		});
		expect(visibility.contextIds).toEqual(new Set(["parent"]));
		expect(visibility.hiddenIds).toEqual(new Set(["other"]));
	});

	it("keeps non-matching children of a matching row visible as context", () => {
		const rows = [
			{ ...row("parent", null, 0, friday), hasChildren: true },
			row("child", "parent", 1, null),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueThisWeek: true,
		});
		expect(visibility.contextIds).toEqual(new Set(["child"]));
		expect(visibility.hiddenIds.size).toBe(0);
	});

	it("keeps completed tasks due this week visible when hideCompleted is off", () => {
		const rows = [
			row("open", null, 0, friday),
			row("done", null, 0, friday, { completed: true }),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueThisWeek: true,
		});
		expect(visibility.hiddenIds.size).toBe(0);
	});

	// The UI keeps due-date filters mutually exclusive; if both are ever
	// active anyway, rows must satisfy every active filter.
	it("requires rows to match all active filters when both are set", () => {
		const rows = [
			row("due-wednesday", null, 0, new Date(2026, 6, 15)),
			row("due-friday", null, 0, friday),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueToday: true,
			dueThisWeek: true,
		});
		expect(visibility.hiddenIds).toEqual(new Set(["due-friday"]));
	});
});

describe("getRowVisibility with dueToday", () => {
	it("keeps a completed task due today visible when hideCompleted is off", () => {
		const rows = [
			row("open", null, 0, wednesday),
			row("done", null, 0, wednesday, { completed: true }),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueToday: true,
		});
		expect(visibility.hiddenIds.size).toBe(0);
	});

	it("still hides a completed task due today when hideCompleted is on", () => {
		const rows = [
			row("open", null, 0, wednesday),
			row("done", null, 0, wednesday, { completed: true }),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueToday: true,
			hideCompleted: true,
		});
		expect(visibility.hiddenIds).toEqual(new Set(["done"]));
	});

	it("keeps a collapsed ancestor visible when one of its hidden descendants matches", () => {
		const rows = [
			{ ...row("parent", null, 0, null), expanded: false, hasChildren: true },
			row("matching-child", "parent", 1, wednesday),
			row("other", null, 0, null),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueToday: true,
		});
		expect(visibility.contextIds).toEqual(new Set(["parent"]));
		expect(visibility.hiddenIds).toEqual(new Set(["matching-child", "other"]));
	});
});

describe("getRowVisibility with tags", () => {
	it("keeps tagged rows and their ancestors visible as context", () => {
		const rows = [
			taggedRow("parent", null, 0, []),
			taggedRow("matching-child", "parent", 1, ["work"]),
			taggedRow("other", null, 0, ["personal"]),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			tags: ["work"],
		});

		expect(visibility.contextIds).toEqual(new Set(["parent"]));
		expect(visibility.hiddenIds).toEqual(new Set(["other"]));
	});

	it("keeps a matching row's descendants visible as context, even without the tag", () => {
		const rows = [
			taggedRow("matching-parent", null, 0, ["work"]),
			taggedRow("child", "matching-parent", 1, []),
			taggedRow("grandchild", "child", 2, []),
			taggedRow("other", null, 0, ["personal"]),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			tags: ["work"],
		});

		expect(visibility.contextIds).toEqual(new Set(["child", "grandchild"]));
		expect(visibility.hiddenIds).toEqual(new Set(["other"]));
	});

	it("keeps a matching row's children hidden when the row itself is collapsed", () => {
		const rows = [
			{
				...taggedRow("matching-parent", null, 0, ["work"]),
				expanded: false,
				hasChildren: true,
			},
			taggedRow("child", "matching-parent", 1, []),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			tags: ["work"],
		});

		expect(visibility.hiddenIds).toEqual(new Set(["child"]));
	});

	it("matches tag names case-insensitively", () => {
		const rows = [taggedRow("matching", null, 0, ["Work"])];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			tags: ["work"],
		});

		expect(visibility.hiddenIds.size).toBe(0);
	});

	it("requires rows to carry every selected tag", () => {
		const rows = [
			taggedRow("all-tags", null, 0, ["work", "urgent"]),
			taggedRow("one-tag", null, 0, ["work"]),
			taggedRow("other-tags", null, 0, ["urgent", "personal"]),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			tags: ["work", "urgent"],
		});

		expect(visibility.hiddenIds).toEqual(new Set(["one-tag", "other-tags"]));
	});

	it("requires rows to match the tag and every other active filter", () => {
		const rows = [
			{
				...taggedRow("tag-and-date", null, 0, ["work"]),
				dueDate: formatCalendarDate(wednesday),
			},
			{
				...taggedRow("tag-only", null, 0, ["work"]),
				dueDate: formatCalendarDate(new Date(2026, 6, 16)),
			},
			{
				...taggedRow("date-only", null, 0, ["personal"]),
				dueDate: formatCalendarDate(wednesday),
			},
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			tags: ["work"],
			dueToday: true,
		});

		expect(visibility.hiddenIds).toEqual(new Set(["tag-only", "date-only"]));
	});
});

describe("isDueOnDate", () => {
	const friday = new Date(2026, 6, 17);

	it("matches only the selected calendar day, ignoring the time of day", () => {
		expect(isDueOnDate(new Date(2026, 6, 17, 23, 30), friday)).toBe(true);
		expect(isDueOnDate(new Date(2026, 6, 16), friday)).toBe(false);
		expect(isDueOnDate(new Date(2026, 6, 18), friday)).toBe(false);
	});
});

describe("getRowVisibility with dueOnDate", () => {
	const friday = new Date(2026, 6, 17);

	it("keeps rows due on the selected date and hides the rest", () => {
		const rows = [
			row("due-friday", null, 0, friday),
			row("due-saturday", null, 0, new Date(2026, 6, 18)),
			row("no-due-date", null, 0, null),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueOnDate: friday,
		});
		expect(visibility.hiddenIds).toEqual(
			new Set(["due-saturday", "no-due-date"]),
		);
	});

	it("keeps ancestors of a match visible as context", () => {
		const rows = [
			row("parent", null, 0, null),
			row("child", "parent", 1, friday),
			row("other", null, 0, null),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueOnDate: friday,
		});
		expect(visibility.contextIds).toEqual(new Set(["parent"]));
		expect(visibility.hiddenIds).toEqual(new Set(["other"]));
	});

	it("keeps completed tasks due on the selected date visible when hideCompleted is off", () => {
		const rows = [
			row("open", null, 0, friday),
			row("done", null, 0, friday, { completed: true }),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueOnDate: friday,
		});
		expect(visibility.hiddenIds.size).toBe(0);
	});
});

describe("getRowVisibility with hideCompleted", () => {
	const friday = new Date(2026, 6, 17);

	it("hides completed tasks and keeps everything else fully visible", () => {
		const rows = [
			row("open", null, 0, null),
			row("done", null, 0, null, { completed: true }),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			hideCompleted: true,
		});
		expect(visibility.hiddenIds).toEqual(new Set(["done"]));
		expect(visibility.contextIds.size).toBe(0);
	});

	it("hides a completed task's entire subtree, even incomplete children", () => {
		const rows = [
			row("done-parent", null, 0, null, { completed: true }),
			row("open-child", "done-parent", 1, null),
			row("done-grandchild", "open-child", 2, null, { completed: true }),
			row("sibling", null, 0, null),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			hideCompleted: true,
		});
		expect(visibility.hiddenIds).toEqual(
			new Set(["done-parent", "open-child", "done-grandchild"]),
		);
	});

	it("leaves non-task nodes untouched even with completed metadata", () => {
		const rows = [
			{ ...row("text-node", null, 0, null, { completed: true }), type: "text" },
			row("open-task", null, 0, null),
		] satisfies VisibleNodeRow[];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			hideCompleted: true,
		});
		expect(visibility.hiddenIds.size).toBe(0);
	});

	it("keeps a match's completed descendants hidden when combined with a due-date filter", () => {
		const rows = [
			row("due-friday", null, 0, friday),
			row("done-child", "due-friday", 1, null, { completed: true }),
			row("open-child", "due-friday", 1, null),
			row("due-next-week", null, 0, new Date(2026, 6, 20)),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueThisWeek: true,
			hideCompleted: true,
		});
		expect(visibility.hiddenIds).toEqual(
			new Set(["done-child", "due-next-week"]),
		);
		expect(visibility.contextIds).toEqual(new Set(["open-child"]));
	});

	it("never surfaces an excluded subtree as ancestor context of a match", () => {
		// A completed parent with a child due this week: exclusion wins, so the
		// whole subtree stays hidden instead of the child matching.
		const rows = [
			row("done-parent", null, 0, null, { completed: true }),
			row("due-child", "done-parent", 1, friday),
			row("due-sibling", null, 0, friday),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueThisWeek: true,
			hideCompleted: true,
		});
		expect(visibility.hiddenIds).toEqual(new Set(["done-parent", "due-child"]));
	});
});

describe("getRowVisibility with dueDateRange", () => {
	const friday = new Date(2026, 6, 17);
	const sunday = new Date(2026, 6, 19);

	it("keeps rows whose due date falls within the range (inclusive) and hides the rest", () => {
		const rows = [
			row("due-friday", null, 0, friday),
			row("due-saturday", null, 0, new Date(2026, 6, 18)),
			row("due-sunday", null, 0, sunday),
			row("due-monday", null, 0, new Date(2026, 6, 20)),
			row("no-due-date", null, 0, null),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueDateRange: { start: friday, end: sunday },
		});
		expect(visibility.hiddenIds).toEqual(
			new Set(["due-monday", "no-due-date"]),
		);
	});

	it("includes rows due exactly on the start and end dates (inclusive boundaries)", () => {
		const rows = [
			row("start", null, 0, friday),
			row("end", null, 0, sunday),
			row("before", null, 0, new Date(2026, 6, 16)),
			row("after", null, 0, new Date(2026, 6, 20)),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueDateRange: { start: friday, end: sunday },
		});
		expect(visibility.hiddenIds).toEqual(new Set(["before", "after"]));
	});

	it("keeps ancestors of a match visible as context", () => {
		const rows = [
			row("parent", null, 0, null),
			row("child", "parent", 1, friday),
			row("other", null, 0, null),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueDateRange: { start: friday, end: sunday },
		});
		expect(visibility.contextIds).toEqual(new Set(["parent"]));
		expect(visibility.hiddenIds).toEqual(new Set(["other"]));
	});

	it("includes a row due on the end day at any time of day, not just midnight", () => {
		const rows = [
			row("end-morning", null, 0, new Date(2026, 6, 19, 9, 0)),
			row("end-evening", null, 0, new Date(2026, 6, 19, 23, 59)),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueDateRange: { start: friday, end: sunday },
		});
		expect(visibility.hiddenIds.size).toBe(0);
	});

	it("keeps completed tasks in range visible when hideCompleted is off", () => {
		const rows = [
			row("open", null, 0, friday),
			row("done", null, 0, friday, { completed: true }),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueDateRange: { start: friday, end: sunday },
		});
		expect(visibility.hiddenIds.size).toBe(0);
	});

	it("hides everything when no rows have a due date in the range", () => {
		const rows = [
			row("before", null, 0, new Date(2026, 6, 16)),
			row("after", null, 0, new Date(2026, 6, 20)),
			row("no-due-date", null, 0, null),
		];
		const visibility = getRowVisibility(rows, {
			...noFilters,
			dueDateRange: { start: friday, end: sunday },
		});
		expect(visibility.hiddenIds).toEqual(
			new Set(["before", "after", "no-due-date"]),
		);
	});
});
