/**
 * The in-app navigation history model: a browser-style back/forward stack over
 * the *nodes* a user has visited, independent of the browser's own history.
 *
 * A visited location is a node's slug, or `null` for the root outline (`/`).
 * Identity is the raw slug string, so a node whose title (and therefore slug)
 * changed between two visits counts as two entries — the stale slug still
 * resolves to the same node through `resolveNodeSlug`, so stepping back to it
 * works, it just shows the older title in the URL.
 */
export type VisitedLocation = string | null;

/**
 * Reads the visited location out of a pathname.
 *
 * Deliberately derived from the URL rather than from `useParams`: route params
 * come from the *committed* match, which under `$nodeSlug`'s `pendingMinMs`
 * lands a few hundred ms after the URL changes. Recording that late would drop
 * a second back/forward press issued before the loader resolved, since the
 * cursor would not have moved yet. The pathname updates as soon as the
 * navigation starts.
 *
 * Only `/` and `/$nodeSlug` live under `_authed`, so the first segment is the
 * whole story.
 */
export function pathnameToVisitedLocation(pathname: string): VisitedLocation {
	const segment = pathname.split("/")[1] ?? "";
	if (!segment) return null;
	try {
		return decodeURIComponent(segment);
	} catch {
		// A malformed escape can't match a real slug, but it's still a distinct
		// place the user navigated to, so keep it rather than collapsing to root.
		return segment;
	}
}

export interface NavigationHistoryState {
	readonly entries: readonly VisitedLocation[];
	/** Position of the currently displayed entry, or `-1` while empty. */
	readonly index: number;
}

/** Keeps a long session's stack bounded; oldest entries drop off the front. */
export const MAX_HISTORY_ENTRIES = 50;

export const emptyNavigationHistory: NavigationHistoryState = {
	entries: [],
	index: -1,
};

export const canStepBack = (state: NavigationHistoryState) => state.index > 0;

export const canStepForward = (state: NavigationHistoryState) =>
	state.index >= 0 && state.index < state.entries.length - 1;

export const previousLocation = (state: NavigationHistoryState) =>
	canStepBack(state) ? state.entries[state.index - 1] : undefined;

export const nextLocation = (state: NavigationHistoryState) =>
	canStepForward(state) ? state.entries[state.index + 1] : undefined;

/**
 * Records that `location` is now displayed.
 *
 * Landing on the entry immediately before or after the current one moves the
 * cursor instead of pushing, which is what keeps this stack from fighting the
 * browser's: our own back/forward buttons, the browser's, and the OS gesture
 * all just change the URL, and all three land here as an adjacent match. Only
 * a genuinely new destination truncates the forward entries and pushes.
 */
export function visit(
	state: NavigationHistoryState,
	location: VisitedLocation,
): NavigationHistoryState {
	// Re-rendering the same node (e.g. a search-param-only change such as
	// toggling a filter) is not a navigation.
	if (state.entries[state.index] === location) return state;

	if (canStepBack(state) && state.entries[state.index - 1] === location) {
		return { entries: state.entries, index: state.index - 1 };
	}

	if (canStepForward(state) && state.entries[state.index + 1] === location) {
		return { entries: state.entries, index: state.index + 1 };
	}

	const entries = [...state.entries.slice(0, state.index + 1), location].slice(
		-MAX_HISTORY_ENTRIES,
	);
	return { entries, index: entries.length - 1 };
}
