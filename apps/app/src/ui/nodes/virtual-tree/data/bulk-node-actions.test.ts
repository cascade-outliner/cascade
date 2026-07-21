import { addTag, removeTag } from "@cascade/outliner/node-tags";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import {
	bulkMoveSubtrees,
	removeSubtrees,
} from "@cascade/outliner/visible-rows";
import { describe, expect, it } from "vitest";

function makeRow(overrides: Partial<VisibleNodeRow>): VisibleNodeRow {
	return {
		id: "node",
		parentId: null,
		content: { root: { type: "root", children: [] } },
		type: "text",
		metadata: null,
		expanded: false,
		order: "a0",
		dueDate: null,
		tags: [],
		depth: 0,
		path: ["a0"],
		hasChildren: false,
		isLastChild: true,
		...overrides,
	};
}

describe("removeSubtrees", () => {
	it("deletes every selected id, including a selected node's own selected descendant", () => {
		const rows = [
			makeRow({ id: "a", order: "a0", path: ["a0"] }),
			makeRow({
				id: "a-child",
				parentId: "a",
				depth: 1,
				order: "a0!a0",
				path: ["a0", "a0"],
			}),
			makeRow({ id: "b", order: "b0", path: ["b0"] }),
		];

		// "a" and its own child "a-child" are both selected; deleting "a" first
		// already removes "a-child", so its own turn through the loop must be a
		// harmless no-op rather than throwing or corrupting the result.
		const result = removeSubtrees(rows, ["a", "a-child"]);

		expect(result.map((r) => r.id)).toEqual(["b"]);
	});
});

describe("bulkMoveSubtrees", () => {
	it("moves only the top-level selected ids, preserving their relative order at the destination", () => {
		const rows = [
			makeRow({ id: "a", order: "a0", path: ["a0"] }),
			makeRow({
				id: "a-child",
				parentId: "a",
				depth: 1,
				order: "a0!a0",
				path: ["a0", "a0"],
				expanded: true,
			}),
			makeRow({ id: "b", order: "b0", path: ["b0"] }),
			makeRow({ id: "c", order: "c0", path: ["c0"] }),
			makeRow({ id: "target", order: "d0", path: ["d0"] }),
		];

		// "a" and "a-child" are both selected: "a-child" isn't top-level (its
		// parent "a" is also selected), so only "a" and "c" get an explicit
		// move — "a-child" moves along with "a" automatically.
		const result = bulkMoveSubtrees(rows, ["a", "a-child", "c"], {
			position: "append",
			parentId: null,
		});

		expect(result.map((r) => r.id)).toEqual([
			"b",
			"target",
			"a",
			"a-child",
			"c",
		]);
	});
});

describe("addTag / removeTag", () => {
	it("adds a tag once, case-insensitively, leaving other tags untouched", () => {
		expect(addTag(["work"], "Urgent")).toEqual(["work", "Urgent"]);
		expect(addTag(["work", "urgent"], "URGENT")).toEqual(["work", "urgent"]);
	});

	it("removes a tag case-insensitively, leaving the rest untouched", () => {
		expect(removeTag(["work", "urgent"], "Urgent")).toEqual(["work"]);
		expect(removeTag(["work"], "missing")).toEqual(["work"]);
	});
});
