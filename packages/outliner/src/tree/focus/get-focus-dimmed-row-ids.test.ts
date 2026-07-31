import { describe, expect, it } from "vitest";
import type { VisibleNodeRow } from "../../nodes/model/node-types";
import { getFocusDimmedRowIds } from "./get-focus-dimmed-row-ids";

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
		tags: [],
		depth,
		path: [],
		hasChildren: false,
		isLastChild: false,
		...overrides,
	};
}

const tree = () => [
	row("root", null, 0, { hasChildren: true }),
	row("a", "root", 1, { hasChildren: true }),
	row("a1", "a", 2, { hasChildren: true }),
	row("a1a", "a1", 3),
	row("b", "root", 1, { isLastChild: true }),
];

describe("getFocusDimmedRowIds", () => {
	it("dims nothing when no node is being edited", () => {
		expect(getFocusDimmedRowIds(tree(), null)).toEqual(new Set());
	});

	it("keeps the edited node and its ancestor chain undimmed", () => {
		const dimmed = getFocusDimmedRowIds(tree(), "a1a");
		expect(dimmed).toEqual(new Set(["b"]));
	});

	it("dims unrelated subtrees when editing a top-level sibling", () => {
		const dimmed = getFocusDimmedRowIds(tree(), "b");
		expect(dimmed).toEqual(new Set(["a", "a1", "a1a"]));
	});

	it("dims siblings and unrelated subtrees while editing a mid-tree node", () => {
		const dimmed = getFocusDimmedRowIds(tree(), "a1");
		expect(dimmed).toEqual(new Set(["a1a", "b"]));
	});
});
