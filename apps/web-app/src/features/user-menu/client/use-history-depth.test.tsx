// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHistoryDepth } from "./use-history-depth";

function dispatchPopState(depth: number | null) {
	act(() => {
		window.dispatchEvent(
			new PopStateEvent("popstate", {
				state: depth === null ? null : { cascadeHistoryDepth: depth },
			}),
		);
	});
}

describe("useHistoryDepth", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("pushes one history entry per depth level increase", () => {
		const pushStateSpy = vi.spyOn(window.history, "pushState");
		const { rerender } = renderHook(
			({ depth }) => useHistoryDepth(depth, vi.fn()),
			{ initialProps: { depth: 0 } },
		);

		rerender({ depth: 2 });

		expect(pushStateSpy).toHaveBeenCalledTimes(2);
		expect(pushStateSpy).toHaveBeenNthCalledWith(
			1,
			{ cascadeHistoryDepth: 1 },
			"",
		);
		expect(pushStateSpy).toHaveBeenNthCalledWith(
			2,
			{ cascadeHistoryDepth: 2 },
			"",
		);
	});

	it("navigates back by the right number of steps when depth decreases, and ignores the resulting popstate", () => {
		const goSpy = vi.spyOn(window.history, "go").mockImplementation(() => {});
		vi.spyOn(window.history, "pushState").mockImplementation(() => {});
		const onDepthChange = vi.fn();
		const { rerender } = renderHook(
			({ depth }) => useHistoryDepth(depth, onDepthChange),
			{ initialProps: { depth: 0 } },
		);

		rerender({ depth: 2 });
		rerender({ depth: 0 });

		expect(goSpy).toHaveBeenCalledWith(-2);

		dispatchPopState(0);

		expect(onDepthChange).not.toHaveBeenCalled();
	});

	it("reports the depth landed on for a browser-initiated back navigation", () => {
		vi.spyOn(window.history, "pushState").mockImplementation(() => {});
		const onDepthChange = vi.fn();
		const { rerender } = renderHook(
			({ depth }) => useHistoryDepth(depth, onDepthChange),
			{ initialProps: { depth: 0 } },
		);

		rerender({ depth: 2 });
		dispatchPopState(1);

		expect(onDepthChange).toHaveBeenCalledWith(1);
	});

	it("reports depth 0 for a browser-initiated back navigation past all pushed entries", () => {
		vi.spyOn(window.history, "pushState").mockImplementation(() => {});
		const onDepthChange = vi.fn();
		const { rerender } = renderHook(
			({ depth }) => useHistoryDepth(depth, onDepthChange),
			{ initialProps: { depth: 0 } },
		);

		rerender({ depth: 1 });
		dispatchPopState(null);

		expect(onDepthChange).toHaveBeenCalledWith(0);
	});

	it("reports a forward navigation into a previously-pushed depth", () => {
		vi.spyOn(window.history, "pushState").mockImplementation(() => {});
		const onDepthChange = vi.fn();
		const { rerender } = renderHook(
			({ depth }) => useHistoryDepth(depth, onDepthChange),
			{ initialProps: { depth: 0 } },
		);

		rerender({ depth: 1 });
		dispatchPopState(0);
		onDepthChange.mockClear();
		dispatchPopState(1);

		expect(onDepthChange).toHaveBeenCalledWith(1);
	});
});
