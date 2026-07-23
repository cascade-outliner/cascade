import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import {
	captureCurrentPosition,
	insertSubtreeAt,
	removeSubtree,
} from "@cascade/outliner/visible-rows";
import { describe, expect, it } from "vitest";

function row(
	id: string,
	parentId: string | null,
	depth: number,
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
		tags: [],
		depth,
		path: [id],
		hasChildren: depth === 1 && id === "b",
		isLastChild: false,
	};
}

// root1
// ├─ a
// ├─ b
// │  └─ b1
// └─ c
// root2
const rows: VisibleNodeRow[] = [
	row("root1", null, 0),
	row("a", "root1", 1),
	row("b", "root1", 1),
	row("b1", "b", 2),
	row("c", "root1", 1),
	row("root2", null, 0),
];

describe("captureCurrentPosition", () => {
	it("returns null for a missing id", () => {
		expect(captureCurrentPosition(rows, "missing")).toBeNull();
	});

	it("targets the previous sibling when one exists", () => {
		expect(captureCurrentPosition(rows, "c")).toEqual({
			position: "after",
			targetId: "b",
			parentId: "root1",
		});
	});

	it("targets the next sibling when there's no previous one", () => {
		expect(captureCurrentPosition(rows, "a")).toEqual({
			position: "before",
			targetId: "b",
			parentId: "root1",
		});
	});

	it("appends to the parent when the node is an only child", () => {
		expect(captureCurrentPosition(rows, "b1")).toEqual({
			position: "append",
			parentId: "b",
		});
	});

	it("works for top-level nodes (null parentId), before a following root", () => {
		expect(captureCurrentPosition(rows, "root1")).toEqual({
			position: "before",
			targetId: "root2",
			parentId: null,
		});
	});

	it("works for top-level nodes (null parentId), after a preceding root", () => {
		expect(captureCurrentPosition(rows, "root2")).toEqual({
			position: "after",
			targetId: "root1",
			parentId: null,
		});
	});
});

describe("insertSubtreeAt", () => {
	it("round-trips removeSubtree: reinserting at the captured position restores DFS order and depths", () => {
		const target = captureCurrentPosition(rows, "b");
		expect(target).not.toBeNull();
		if (!target) return;

		const removed = removeSubtree(rows, "b");
		const bRow = rows.find((r) => r.id === "b") as VisibleNodeRow;
		const b1Row = rows.find((r) => r.id === "b1") as VisibleNodeRow;
		// Descendants come in as depths relative to the root being reinserted,
		// matching visibleTree({ rootId: "b" })'s shape (direct children at 0).
		const restored = insertSubtreeAt(
			removed,
			bRow,
			[{ ...b1Row, depth: 0 }],
			target,
		);

		expect(restored.map((r) => ({ id: r.id, depth: r.depth }))).toEqual(
			rows.map((r) => ({ id: r.id, depth: r.depth })),
		);
		expect(restored.find((r) => r.id === "b1")?.parentId).toBe("b");
	});

	it("reinserts a childless node with no descendants", () => {
		const target = captureCurrentPosition(rows, "a");
		expect(target).not.toBeNull();
		if (!target) return;

		const removed = removeSubtree(rows, "a");
		const aRow = rows.find((r) => r.id === "a") as VisibleNodeRow;
		const restored = insertSubtreeAt(removed, aRow, [], target);

		expect(restored.map((r) => r.id)).toEqual(rows.map((r) => r.id));
	});
});
