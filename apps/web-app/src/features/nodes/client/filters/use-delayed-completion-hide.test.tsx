// @vitest-environment jsdom
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	COMPLETED_HIDE_DELAY_MS,
	revealPendingCompletions,
	useDelayedCompletionHide,
} from "./use-delayed-completion-hide";

function taskRow(
	id: string,
	completed: boolean,
	overrides: Partial<VisibleNodeRow> = {},
): VisibleNodeRow {
	return {
		id,
		parentId: null,
		content: null,
		type: "task",
		metadata: { completed },
		expanded: true,
		order: "a",
		dueDate: null,
		tags: [],
		depth: 0,
		path: [],
		hasChildren: false,
		isLastChild: true,
		...overrides,
	};
}

describe("useDelayedCompletionHide", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("does not delay a task that was already completed on mount", () => {
		const rows = [taskRow("a", true)];
		const { result } = renderHook(() => useDelayedCompletionHide(rows, true));

		expect(result.current.size).toBe(0);
	});

	it("delays hiding a task just checked off, then lets it hide after the grace period", () => {
		const incomplete = [taskRow("a", false)];
		const { result, rerender } = renderHook(
			({ rows, hideCompleted }) =>
				useDelayedCompletionHide(rows, hideCompleted),
			{ initialProps: { rows: incomplete, hideCompleted: true } },
		);
		expect(result.current.has("a")).toBe(false);

		const completed = [taskRow("a", true)];
		act(() => rerender({ rows: completed, hideCompleted: true }));
		expect(result.current.has("a")).toBe(true);

		act(() => vi.advanceTimersByTime(COMPLETED_HIDE_DELAY_MS));
		expect(result.current.has("a")).toBe(false);
	});

	it("does not delay when the hide-completed filter is off", () => {
		const incomplete = [taskRow("a", false)];
		const { result, rerender } = renderHook(
			({ rows, hideCompleted }) =>
				useDelayedCompletionHide(rows, hideCompleted),
			{ initialProps: { rows: incomplete, hideCompleted: false } },
		);

		const completed = [taskRow("a", true)];
		act(() => rerender({ rows: completed, hideCompleted: false }));
		expect(result.current.size).toBe(0);
	});

	it("clears the pending state if the task is unchecked before the delay elapses", () => {
		const incomplete = [taskRow("a", false)];
		const { result, rerender } = renderHook(
			({ rows, hideCompleted }) =>
				useDelayedCompletionHide(rows, hideCompleted),
			{ initialProps: { rows: incomplete, hideCompleted: true } },
		);

		const completed = [taskRow("a", true)];
		act(() => rerender({ rows: completed, hideCompleted: true }));
		expect(result.current.has("a")).toBe(true);

		act(() => rerender({ rows: incomplete, hideCompleted: true }));
		expect(result.current.has("a")).toBe(false);

		act(() => vi.advanceTimersByTime(COMPLETED_HIDE_DELAY_MS));
		expect(result.current.size).toBe(0);
	});
});

describe("revealPendingCompletions", () => {
	it("returns the original set when nothing is pending", () => {
		const hiddenIds = new Set(["a"]);
		expect(revealPendingCompletions(hiddenIds, new Set(), [])).toBe(hiddenIds);
	});

	it("keeps a pending task and its whole subtree visible", () => {
		const rows = [
			taskRow("a", true),
			taskRow("b", false, { parentId: "a", depth: 1 }),
			taskRow("c", false, { parentId: "b", depth: 2 }),
			taskRow("d", false),
		];
		const hiddenIds = new Set(["a", "b", "c"]);

		const result = revealPendingCompletions(hiddenIds, new Set(["a"]), rows);

		expect(result.has("a")).toBe(false);
		expect(result.has("b")).toBe(false);
		expect(result.has("c")).toBe(false);
		expect(result.has("d")).toBe(false);
	});
});
