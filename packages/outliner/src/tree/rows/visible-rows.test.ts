import { describe, expect, it } from "vitest";
import type { VisibleNodeRow } from "../../nodes/model/node-types";
import {
	collapseNode,
	expandNode,
	insertRowAfter,
	insertSubtreeAfter,
	moveSubtree,
	moveWouldChangePosition,
	removeSubtree,
	siblingPosition,
} from "./visible-rows";

function row(
	id: string,
	parentId: string | null,
	depth: number,
	path: string[],
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
		path,
		hasChildren: false,
		isLastChild: false,
		...overrides,
	};
}

const tree = () => [
	row("root", null, 0, ["root"], { hasChildren: true }),
	row("a", "root", 1, ["root", "a"]),
	row("b", "root", 1, ["root", "b"], { hasChildren: true }),
	row("b1", "b", 2, ["root", "b", "b1"], { isLastChild: true }),
	row("c", "root", 1, ["root", "c"], { isLastChild: true }),
	row("other", null, 0, ["other"], { hasChildren: true, isLastChild: true }),
	row("d", "other", 1, ["other", "d"], { isLastChild: true }),
];

describe("visible-row mutations", () => {
	it("collapses and expands with absolute depths and paths", () => {
		const collapsed = collapseNode(tree(), "b");
		expect(collapsed.map(({ id }) => id)).toEqual([
			"root",
			"a",
			"b",
			"c",
			"other",
			"d",
		]);

		const expanded = expandNode(collapsed, "b", [
			row("b1", "b", 0, ["b1"], { isLastChild: true }),
			row("b1a", "b1", 1, ["b1", "b1a"], { isLastChild: true }),
		]);
		expect(
			expanded
				.filter(({ id }) => id.startsWith("b"))
				.map(({ id, depth, path }) => ({ id, depth, path })),
		).toEqual([
			{ id: "b", depth: 1, path: ["root", "b"] },
			{ id: "b1", depth: 2, path: ["root", "b", "b1"] },
			{ id: "b1a", depth: 3, path: ["root", "b", "b1", "b1a"] },
		]);
	});

	it.each([
		{
			name: "before a sibling",
			target: {
				position: "before" as const,
				targetId: "d",
				parentId: "other",
			},
			expected: ["root", "a", "c", "other", "b", "b1", "d"],
		},
		{
			name: "after a sibling",
			target: {
				position: "after" as const,
				targetId: "d",
				parentId: "other",
			},
			expected: ["root", "a", "c", "other", "d", "b", "b1"],
		},
		{
			name: "appended to a parent",
			target: { position: "append" as const, parentId: "other" },
			expected: ["root", "a", "c", "other", "d", "b", "b1"],
		},
	])("moves a subtree $name and repairs structure", ({ target, expected }) => {
		const moved = moveSubtree(tree(), "b", target);
		expect(moved.map(({ id }) => id)).toEqual(expected);
		expect(moved.find(({ id }) => id === "b")).toMatchObject({
			parentId: "other",
			depth: 1,
			path: ["other", "b"],
		});
		expect(moved.find(({ id }) => id === "b1")).toMatchObject({
			parentId: "b",
			depth: 2,
			path: ["other", "b", "b1"],
		});
		expect(
			moved
				.filter(({ parentId }) => parentId === "other")
				.map((r) => r.isLastChild),
		).toEqual([false, true]);
	});

	it("rejects a target outside the requested parent", () => {
		expect(
			moveSubtree(tree(), "b", {
				position: "before",
				targetId: "d",
				parentId: "root",
			}),
		).toEqual(tree());
	});

	it("distinguishes real moves from equivalent current-position targets", () => {
		expect(
			moveWouldChangePosition(tree(), "b", {
				position: "after",
				targetId: "a",
				parentId: "root",
			}),
		).toBe(false);
		expect(
			moveWouldChangePosition(tree(), "b", {
				position: "before",
				targetId: "c",
				parentId: "root",
			}),
		).toBe(false);
		expect(
			moveWouldChangePosition(tree(), "b", {
				position: "append",
				parentId: "other",
			}),
		).toBe(true);
	});

	it("repairs an emptied parent and sibling-tail flags when removing", () => {
		const result = removeSubtree(tree(), "d");
		expect(result.find(({ id }) => id === "other")).toMatchObject({
			hasChildren: false,
			expanded: false,
			isLastChild: true,
		});
		expect(result.some(({ id }) => id === "d")).toBe(false);
	});

	it("inserts after the complete sibling subtree and recomputes tails", () => {
		const inserted = insertRowAfter(
			tree(),
			"b",
			row("x", "root", 1, ["root", "x"]),
		);
		expect(inserted.map(({ id }) => id)).toEqual([
			"root",
			"a",
			"b",
			"b1",
			"x",
			"c",
			"other",
			"d",
		]);
		expect(
			inserted
				.filter(({ parentId }) => parentId === "root")
				.map((r) => r.isLastChild),
		).toEqual([false, false, false, true]);
	});

	it("prefixes relative descendant paths when inserting a fetched subtree", () => {
		const inserted = insertSubtreeAfter(
			tree(),
			"c",
			row("copy", "root", 1, ["root", "copy"], { hasChildren: true }),
			[row("copy-child", "copy", 0, ["copy-child"], { isLastChild: true })],
		);
		expect(inserted.find(({ id }) => id === "copy-child")).toMatchObject({
			depth: 2,
			path: ["root", "copy", "copy-child"],
		});
	});
});

describe("siblingPosition", () => {
	it.each([
		["root", { posInSet: 1, setSize: 2 }],
		["a", { posInSet: 1, setSize: 3 }],
		["b", { posInSet: 2, setSize: 3 }],
		["c", { posInSet: 3, setSize: 3 }],
		["b1", { posInSet: 1, setSize: 1 }],
	])("reports ARIA position for %s", (id, expected) => {
		const rows = tree();
		expect(
			siblingPosition(
				rows,
				rows.findIndex((row) => row.id === id),
			),
		).toEqual(expected);
	});

	it("returns null for an invalid index", () => {
		expect(siblingPosition(tree(), -1)).toBeNull();
	});
});
