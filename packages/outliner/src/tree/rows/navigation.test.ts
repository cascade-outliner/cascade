import { describe, expect, it } from "vitest";
import type { VisibleNodeRow } from "../../nodes/model/node-types";
import {
	findDeleteEmptyFocusTarget,
	findFocusNeighbor,
	navigableRows,
} from "./navigation";

function row(
	id: string,
	parentId: string | null,
	depth: number,
	overrides: Partial<VisibleNodeRow> = {},
): VisibleNodeRow {
	return {
		id,
		parentId,
		content: null,
		type: "text",
		metadata: null,
		expanded: true,
		order: id,
		dueDate: null,
		recurrence: null,
		icon: null,
		tags: [],
		depth,
		path: [id],
		hasChildren: false,
		isLastChild: false,
		...overrides,
	};
}

const rows = () => [
	row("a", null, 0),
	row("b", null, 0),
	row("c", null, 0),
	row("d", null, 0),
];

describe("navigableRows", () => {
	it("returns the full list when there are no hidden rows", () => {
		expect(navigableRows(rows(), undefined)).toEqual(rows());
		expect(navigableRows(rows(), new Set())).toEqual(rows());
	});

	it("excludes hidden rows", () => {
		expect(navigableRows(rows(), new Set(["b"])).map((r) => r.id)).toEqual([
			"a",
			"c",
			"d",
		]);
	});
});

describe("findFocusNeighbor", () => {
	it("returns the adjacent row in the unfiltered list", () => {
		expect(findFocusNeighbor(rows(), "b", 1)?.id).toBe("c");
		expect(findFocusNeighbor(rows(), "b", -1)?.id).toBe("a");
	});

	it("returns null past the ends of the list", () => {
		expect(findFocusNeighbor(rows(), "a", -1)).toBeNull();
		expect(findFocusNeighbor(rows(), "d", 1)).toBeNull();
	});

	it("returns null for an id not present in the list", () => {
		expect(findFocusNeighbor(rows(), "missing", 1)).toBeNull();
	});

	it("skips a hidden neighbor when given a pre-filtered row list", () => {
		const visible = navigableRows(rows(), new Set(["c"]));
		// b's next visible neighbor should be d, not the hidden c.
		expect(findFocusNeighbor(visible, "b", 1)?.id).toBe("d");
	});
});

describe("findDeleteEmptyFocusTarget", () => {
	it("prefers the previous row, then falls back to the next", () => {
		expect(findDeleteEmptyFocusTarget(rows(), "c")?.id).toBe("b");
		expect(findDeleteEmptyFocusTarget(rows(), "a")?.id).toBe("b");
	});

	it("returns null when the list only has the deleted row", () => {
		expect(findDeleteEmptyFocusTarget([row("a", null, 0)], "a")).toBeNull();
	});

	it("skips a hidden neighbor when given a pre-filtered row list", () => {
		const visible = navigableRows(rows(), new Set(["b"]));
		// Deleting c should focus a (previous visible row), skipping hidden b.
		expect(findDeleteEmptyFocusTarget(visible, "c")?.id).toBe("a");
	});
});
