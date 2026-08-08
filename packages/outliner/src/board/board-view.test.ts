import { describe, expect, it } from "vitest";
import type { StatusOption, StatusSummary } from "../nodes/model/node-statuses";
import type { VisibleNodeRow } from "../nodes/model/node-types";
import { groupRowsIntoColumns } from "./board-view";

function row(
	id: string,
	status: StatusSummary | null,
	overrides: Partial<VisibleNodeRow> = {},
): VisibleNodeRow {
	return {
		id,
		parentId: "root",
		content: null,
		type: "text",
		metadata: null,
		expanded: true,
		order: "a0",
		dueDate: null,
		dueTime: null,
		recurrence: null,
		icon: null,
		color: null,
		tags: [],
		status,
		depth: 0,
		path: ["a0"],
		hasChildren: false,
		isLastChild: false,
		...overrides,
	};
}

const todo: StatusOption = {
	id: "s-todo",
	name: "To do",
	color: "sky",
	hidden: false,
};
const done: StatusOption = {
	id: "s-done",
	name: "Done",
	color: "emerald",
	hidden: false,
};

describe("groupRowsIntoColumns", () => {
	it("puts an always-first unassigned column ahead of one column per status", () => {
		const columns = groupRowsIntoColumns([], [todo, done]);

		expect(columns.map((c) => c.status?.id ?? null)).toEqual([
			null,
			"s-todo",
			"s-done",
		]);
	});

	it("groups cards by their denormalized status id", () => {
		const rows = [
			row("a", todo),
			row("b", null),
			row("c", done),
			row("d", todo),
		];

		const columns = groupRowsIntoColumns(rows, [todo, done]);

		expect(
			columns.find((c) => c.status === null)?.cards.map((r) => r.id),
		).toEqual(["b"]);
		expect(
			columns.find((c) => c.status?.id === "s-todo")?.cards.map((r) => r.id),
		).toEqual(["a", "d"]);
		expect(
			columns.find((c) => c.status?.id === "s-done")?.cards.map((r) => r.id),
		).toEqual(["c"]);
	});

	it("preserves each column's row order", () => {
		const rows = [row("first", todo), row("second", todo), row("third", todo)];

		const columns = groupRowsIntoColumns(rows, [todo]);

		expect(
			columns.find((c) => c.status?.id === "s-todo")?.cards.map((r) => r.id),
		).toEqual(["first", "second", "third"]);
	});

	it("renders empty columns for statuses with no matching cards", () => {
		const columns = groupRowsIntoColumns([row("a", todo)], [todo, done]);

		expect(columns.find((c) => c.status?.id === "s-done")?.cards).toEqual([]);
	});

	it("still gives a hidden status its own column, carrying its hidden flag, rather than folding it away", () => {
		const hiddenStatus: StatusOption = { ...done, hidden: true };
		const rows = [row("a", todo), row("b", hiddenStatus), row("c", null)];

		const columns = groupRowsIntoColumns(rows, [todo, hiddenStatus]);

		expect(columns.map((c) => c.status?.id ?? null)).toEqual([
			null,
			"s-todo",
			"s-done",
		]);
		const hiddenColumn = columns.find((c) => c.status?.id === "s-done");
		expect(hiddenColumn?.status?.hidden).toBe(true);
		expect(hiddenColumn?.cards.map((r) => r.id)).toEqual(["b"]);
	});
});
