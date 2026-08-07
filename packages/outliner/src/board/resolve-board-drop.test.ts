import { describe, expect, it } from "vitest";
import type { VisibleNodeRow } from "../nodes/model/node-types";
import type { BoardColumn } from "./model/board.types";
import { resolveCardDrop, resolveColumnDrop } from "./resolve-board-drop";

function card(id: string): VisibleNodeRow {
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
		tags: [],
		status: null,
		depth: 0,
		path: ["a0"],
		hasChildren: false,
		isLastChild: false,
	};
}

describe("resolveCardDrop", () => {
	it("resolves a top-edge drop to a before-target move in the dropped-on column", () => {
		const result = resolveCardDrop("top", "over-card", "s-done", "root");

		expect(result).toEqual({
			statusId: "s-done",
			target: { position: "before", targetId: "over-card", parentId: "root" },
		});
	});

	it("resolves a bottom-edge drop to an after-target move", () => {
		const result = resolveCardDrop("bottom", "over-card", null, "root");

		expect(result).toEqual({
			statusId: null,
			target: { position: "after", targetId: "over-card", parentId: "root" },
		});
	});
});

describe("resolveColumnDrop", () => {
	it("appends after the column's last card", () => {
		const columns: BoardColumn[] = [
			{
				status: { id: "s-done", name: "Done", color: "emerald", hidden: false },
				cards: [card("a"), card("b")],
			},
		];

		const result = resolveColumnDrop("dragged", "s-done", columns, "root");

		expect(result).toEqual({
			statusId: "s-done",
			target: { position: "after", targetId: "b", parentId: "root" },
		});
	});

	it("appends as the first child when the column is empty", () => {
		const columns: BoardColumn[] = [
			{
				status: { id: "s-done", name: "Done", color: "emerald", hidden: false },
				cards: [],
			},
		];

		const result = resolveColumnDrop("dragged", "s-done", columns, "root");

		expect(result).toEqual({
			statusId: "s-done",
			target: { position: "append", parentId: "root" },
		});
	});

	it("excludes the dragged card itself from the column's other cards", () => {
		const columns: BoardColumn[] = [
			{
				status: { id: "s-done", name: "Done", color: "emerald", hidden: false },
				cards: [card("dragged")],
			},
		];

		const result = resolveColumnDrop("dragged", "s-done", columns, "root");

		expect(result).toEqual({
			statusId: "s-done",
			target: { position: "append", parentId: "root" },
		});
	});

	it("falls back to the unassigned column when statusId is null", () => {
		const columns: BoardColumn[] = [
			{ status: null, cards: [card("a")] },
			{
				status: { id: "s-done", name: "Done", color: "emerald", hidden: false },
				cards: [],
			},
		];

		const result = resolveColumnDrop("dragged", null, columns, "root");

		expect(result).toEqual({
			statusId: null,
			target: { position: "after", targetId: "a", parentId: "root" },
		});
	});
});
