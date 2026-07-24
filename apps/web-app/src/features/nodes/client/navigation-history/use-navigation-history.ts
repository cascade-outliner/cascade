import { useRouter, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
	canStepBack,
	canStepForward,
	nextLocation,
	pathnameToVisitedLocation,
	previousLocation,
	type VisitedLocation,
} from "./navigation-history";
import { navigationHistoryStore } from "./navigation-history-store";

/**
 * In-app back/forward stepping across visited nodes (#452).
 *
 * Mount this once inside `_authed`. It records the node currently on screen
 * and exposes the two step actions; both only navigate — the resulting route
 * change comes back through the same recording effect, which moves the cursor
 * via `visit`'s adjacent-entry match. Keeping the router as the single source
 * of truth means a navigation that never completes (a failed loader, an
 * aborted transition) leaves the stack untouched, and the browser's own
 * back/forward moves the cursor exactly like ours does.
 */
export function useNavigationHistory() {
	const router = useRouter();
	const state = useSyncExternalStore(
		navigationHistoryStore.subscribe,
		navigationHistoryStore.getSnapshot,
		navigationHistoryStore.getServerSnapshot,
	);

	const location = useRouterState({
		select: (routerState) =>
			pathnameToVisitedLocation(routerState.location.pathname),
	});

	useEffect(() => {
		navigationHistoryStore.record(location);
	}, [location]);

	const go = useCallback(
		(location: VisitedLocation | undefined) => {
			if (location === undefined) return;
			if (location === null) {
				router.navigate({ to: "/", search: true, viewTransition: true });
				return;
			}
			router.navigate({
				to: "/$nodeSlug",
				params: { nodeSlug: location },
				search: true,
				viewTransition: true,
			});
		},
		[router],
	);

	const goBack = useCallback(() => go(previousLocation(state)), [go, state]);
	const goForward = useCallback(() => go(nextLocation(state)), [go, state]);

	return {
		canGoBack: canStepBack(state),
		canGoForward: canStepForward(state),
		goBack,
		goForward,
	};
}
