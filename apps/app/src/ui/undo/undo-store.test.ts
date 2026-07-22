import { beforeEach, describe, expect, it, vi } from "vitest";
import { undoStore } from "./undo-store";

vi.mock("@cascade/ui/toast", () => ({
	toast: { info: vi.fn() },
}));

beforeEach(() => {
	undoStore.reset();
});

describe("undoStore", () => {
	it("undo runs the last pushed action's undo and moves it to the redo stack", () => {
		const undo = vi.fn();
		const redo = vi.fn();
		undoStore.push({ undo, redo });

		undoStore.undo();

		expect(undo).toHaveBeenCalledTimes(1);
		expect(redo).not.toHaveBeenCalled();
	});

	it("redo runs the action's redo after an undo", () => {
		const undo = vi.fn();
		const redo = vi.fn();
		undoStore.push({ undo, redo });

		undoStore.undo();
		undoStore.redo();

		expect(redo).toHaveBeenCalledTimes(1);
	});

	it("undoes actions in LIFO order", () => {
		const order: string[] = [];
		undoStore.push({
			undo: () => {
				order.push("a");
			},
			redo: () => {},
		});
		undoStore.push({
			undo: () => {
				order.push("b");
			},
			redo: () => {},
		});

		undoStore.undo();
		undoStore.undo();

		expect(order).toEqual(["b", "a"]);
	});

	it("undo/redo are no-ops when their stack is empty", () => {
		expect(() => undoStore.undo()).not.toThrow();
		expect(() => undoStore.redo()).not.toThrow();
	});

	it("pushing a new action after an undo clears the redo stack", () => {
		const firstRedo = vi.fn();
		undoStore.push({ undo: () => {}, redo: firstRedo });
		undoStore.undo();

		undoStore.push({ undo: () => {}, redo: () => {} });
		undoStore.redo();

		expect(firstRedo).not.toHaveBeenCalled();
	});
});
