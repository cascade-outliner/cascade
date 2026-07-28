// @vitest-environment jsdom
import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { noFilters } from "@cascade/outliner/node-filters";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	COMPLETED_HIDE_DELAY_MS,
	useDelayedCompletionHide,
	withPendingTasksIncomplete,
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

describe("withPendingTasksIncomplete", () => {
	it("returns the original array when nothing is pending", () => {
		const rows = [taskRow("a", true)];
		expect(withPendingTasksIncomplete(rows, new Set())).toBe(rows);
	});

	it("forces a pending task's completed flag back to false", () => {
		const rows = [taskRow("a", true)];
		const result = withPendingTasksIncomplete(rows, new Set(["a"]));
		expect(result[0].metadata?.completed).toBe(false);
	});

	it("leaves non-pending rows untouched", () => {
		const rows = [taskRow("a", true), taskRow("b", true)];
		const result = withPendingTasksIncomplete(rows, new Set(["a"]));
		expect(result[0].metadata?.completed).toBe(false);
		expect(result[1].metadata?.completed).toBe(true);
	});
});

describe("delayed hiding combined with getRowVisibility", () => {
	const filters = { ...noFilters, hideCompleted: true };

	it("keeps a just-completed parent and its non-completed child visible", () => {
		const rows = [
			taskRow("parent", true),
			taskRow("child", false, { parentId: "parent", depth: 1 }),
		];

		const visibility = getRowVisibility(
			withPendingTasksIncomplete(rows, new Set(["parent"])),
			filters,
		);

		expect(visibility.hiddenIds.has("parent")).toBe(false);
		expect(visibility.hiddenIds.has("child")).toBe(false);
	});

	it("does not resurface a child that was already completed and hidden before the parent was checked", () => {
		const rows = [
			taskRow("parent", true),
			taskRow("child", true, { parentId: "parent", depth: 1 }),
		];

		// Only "parent" just transitioned to completed; "child" was already
		// completed (and hidden) beforehand, so it's not in the pending set.
		const visibility = getRowVisibility(
			withPendingTasksIncomplete(rows, new Set(["parent"])),
			filters,
		);

		expect(visibility.hiddenIds.has("parent")).toBe(false);
		expect(visibility.hiddenIds.has("child")).toBe(true);
	});
});
