// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigationHistoryStore } from "./navigation-history-store";
import { useNavigationHistory } from "./use-navigation-history";

const navigate = vi.fn();
let currentSlug: string | undefined;

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ navigate }),
	// Mirrors the real `useRouterState({ select })`: the root outline route is
	// `/`, a node detail route is `/<slug>`.
	useRouterState: ({
		select,
	}: {
		select: (state: { location: { pathname: string } }) => string | null;
	}) => select({ location: { pathname: `/${currentSlug ?? ""}` } }),
}));

beforeEach(() => {
	navigate.mockClear();
	currentSlug = undefined;
	navigationHistoryStore.reset();
});

// This workspace's vitest config registers no setup file, so testing-library's
// auto-cleanup is off. A hook left mounted would keep its store subscription
// and record the next test's visits alongside the hook under test.
afterEach(cleanup);

/** Renders the hook and lets the test drive which node is on screen. */
function renderNavigationHistory(initialSlug?: string) {
	currentSlug = initialSlug;
	const view = renderHook(() => useNavigationHistory());
	return {
		...view,
		/** Simulates the router landing on another node. */
		land(slug?: string) {
			currentSlug = slug;
			view.rerender();
		},
	};
}

describe("useNavigationHistory", () => {
	it("cannot step anywhere from the first node of a session", () => {
		const { result } = renderNavigationHistory("a-1111aaaa");

		expect(result.current.canGoBack).toBe(false);
		expect(result.current.canGoForward).toBe(false);
	});

	it("enables going back once a second node has been visited", () => {
		const { result, land } = renderNavigationHistory("a-1111aaaa");
		act(() => land("b-2222bbbb"));

		expect(result.current.canGoBack).toBe(true);
		expect(result.current.canGoForward).toBe(false);
	});

	it("navigates to the previously visited node's slug", () => {
		const { result, land } = renderNavigationHistory("a-1111aaaa");
		act(() => land("b-2222bbbb"));
		act(() => result.current.goBack());

		expect(navigate).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "/$nodeSlug",
				params: { nodeSlug: "a-1111aaaa" },
			}),
		);
	});

	it("navigates to the root outline when the previous entry is the tree view", () => {
		const { result, land } = renderNavigationHistory();
		act(() => land("a-1111aaaa"));
		act(() => result.current.goBack());

		expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: "/" }));
	});

	it("moves the cursor once the navigation it triggered lands", () => {
		const { result, land } = renderNavigationHistory("a-1111aaaa");
		act(() => land("b-2222bbbb"));
		act(() => result.current.goBack());
		act(() => land("a-1111aaaa"));

		expect(result.current.canGoBack).toBe(false);
		expect(result.current.canGoForward).toBe(true);

		act(() => result.current.goForward());
		expect(navigate).toHaveBeenLastCalledWith(
			expect.objectContaining({ params: { nodeSlug: "b-2222bbbb" } }),
		);
	});

	it("leaves the stack untouched when a triggered navigation never lands", () => {
		const { result, land } = renderNavigationHistory("a-1111aaaa");
		act(() => land("b-2222bbbb"));
		act(() => result.current.goBack());

		expect(result.current.canGoBack).toBe(true);
		expect(result.current.canGoForward).toBe(false);
	});

	it("does nothing when there is nowhere to step", () => {
		const { result } = renderNavigationHistory("a-1111aaaa");

		act(() => result.current.goBack());
		act(() => result.current.goForward());

		expect(navigate).not.toHaveBeenCalled();
	});
});
