// @vitest-environment jsdom
import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { noFilters } from "@cascade/outliner/node-filters";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	COMPLETED_EXIT_DURATION_MS,
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
		icon: null,
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

		expect(result.current.pendingIds.size).toBe(0);
		expect(result.current.exitingIds.size).toBe(0);
	});

	it("delays a checked task, fades it after the grace period, then lets it hide", () => {
		const incomplete = [taskRow("a", false)];
		const { result, rerender } = renderHook(
			({ rows, hideCompleted }) =>
				useDelayedCompletionHide(rows, hideCompleted),
			{ initialProps: { rows: incomplete, hideCompleted: true } },
		);
		expect(result.current.pendingIds.has("a")).toBe(false);

		const completed = [taskRow("a", true)];
		act(() => rerender({ rows: completed, hideCompleted: true }));
		expect(result.current.pendingIds.has("a")).toBe(true);
		expect(result.current.exitingIds.has("a")).toBe(false);

		act(() => vi.advanceTimersByTime(COMPLETED_HIDE_DELAY_MS));
		expect(result.current.pendingIds.has("a")).toBe(true);
		expect(result.current.exitingIds.has("a")).toBe(true);

		act(() => vi.advanceTimersByTime(COMPLETED_EXIT_DURATION_MS));
		expect(result.current.pendingIds.has("a")).toBe(false);
		expect(result.current.exitingIds.has("a")).toBe(false);
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
		expect(result.current.pendingIds.size).toBe(0);
		expect(result.current.exitingIds.size).toBe(0);
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
		expect(result.current.pendingIds.has("a")).toBe(true);

		act(() => rerender({ rows: incomplete, hideCompleted: true }));
		expect(result.current.pendingIds.has("a")).toBe(false);
		expect(result.current.exitingIds.has("a")).toBe(false);

		act(() =>
			vi.advanceTimersByTime(
				COMPLETED_HIDE_DELAY_MS + COMPLETED_EXIT_DURATION_MS,
			),
		);
		expect(result.current.pendingIds.size).toBe(0);
	});

	it("cancels an active exit if completion is undone or fails", () => {
		const incomplete = [taskRow("a", false)];
		const { result, rerender } = renderHook(
			({ rows }) => useDelayedCompletionHide(rows, true),
			{ initialProps: { rows: incomplete } },
		);

		act(() => rerender({ rows: [taskRow("a", true)] }));
		act(() => vi.advanceTimersByTime(COMPLETED_HIDE_DELAY_MS));
		expect(result.current.exitingIds.has("a")).toBe(true);

		act(() => rerender({ rows: incomplete }));
		expect(result.current.pendingIds.has("a")).toBe(false);
		expect(result.current.exitingIds.has("a")).toBe(false);
	});

	it("does not delay a row that arrives already completed, e.g. expanding a collapsed subtree", () => {
		const before = [taskRow("parent", false)];
		const { result, rerender } = renderHook(
			({ rows, hideCompleted }) =>
				useDelayedCompletionHide(rows, hideCompleted),
			{ initialProps: { rows: before, hideCompleted: true } },
		);

		// "child" wasn't in `rows` at all before this render — it just got
		// fetched in by expanding "parent" — and it was already completed,
		// not just checked off, so it must not get a grace period.
		const afterExpand = [
			taskRow("parent", false),
			taskRow("child", true, { parentId: "parent", depth: 1 }),
		];
		act(() => rerender({ rows: afterExpand, hideCompleted: true }));

		expect(result.current.pendingIds.has("child")).toBe(false);
		expect(result.current.exitingIds.has("child")).toBe(false);
	});

	it("does not animate rows when hide-completed is enabled in bulk", () => {
		const completed = [taskRow("a", true)];
		const { result, rerender } = renderHook(
			({ hideCompleted }) => useDelayedCompletionHide(completed, hideCompleted),
			{ initialProps: { hideCompleted: false } },
		);

		act(() => rerender({ hideCompleted: true }));
		act(() =>
			vi.advanceTimersByTime(
				COMPLETED_HIDE_DELAY_MS + COMPLETED_EXIT_DURATION_MS,
			),
		);

		expect(result.current.pendingIds.size).toBe(0);
		expect(result.current.exitingIds.size).toBe(0);
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
