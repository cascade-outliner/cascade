import {
	emptyNavigationHistory,
	type NavigationHistoryState,
	type VisitedLocation,
	visit,
} from "./navigation-history";

// Module-level singleton (same pattern as `undo-store.ts`): navigation history
// is session-scoped and has to survive every route change, so it can't live in
// state owned by a route component that unmounts on navigation. Only mutated
// from a client-side effect, never during SSR.
let state: NavigationHistoryState = emptyNavigationHistory;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Stable across no-op visits so `useSyncExternalStore` doesn't re-render. */
const getSnapshot = () => state;

/** SSR renders the buttons disabled; the first client visit fills the stack. */
const getServerSnapshot = () => emptyNavigationHistory;

function record(location: VisitedLocation) {
	const next = visit(state, location);
	if (next === state) return;
	state = next;
	for (const listener of listeners) listener();
}

/** Test-only: clears the stack so specs don't leak state across cases. */
function reset() {
	state = emptyNavigationHistory;
	for (const listener of listeners) listener();
}

export const navigationHistoryStore = {
	subscribe,
	getSnapshot,
	getServerSnapshot,
	record,
	reset,
};
