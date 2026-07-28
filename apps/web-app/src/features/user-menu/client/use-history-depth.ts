import { useEffect, useRef } from "react";

interface HistoryDepthState {
	cascadeHistoryDepth: number;
}

/**
 * Pushes one browser history entry per level of `depth`, so a mobile back/forward
 * gesture (or hardware back button) steps through nested dismissible UI - e.g. a
 * dialog, and a sub-page inside it - instead of navigating away from the app.
 * `onDepthChange` only fires for navigation the browser initiated (back/forward),
 * not for the pushes/pops this hook makes itself to keep history in sync with `depth`.
 */
export function useHistoryDepth(
	depth: number,
	onDepthChange: (newDepth: number) => void,
) {
	const currentDepthRef = useRef(0);
	const ignoreNextPopStateRef = useRef(false);
	const onDepthChangeRef = useRef(onDepthChange);
	onDepthChangeRef.current = onDepthChange;

	useEffect(() => {
		if (depth === currentDepthRef.current) return;

		if (depth > currentDepthRef.current) {
			for (let level = currentDepthRef.current + 1; level <= depth; level++) {
				const state: HistoryDepthState = { cascadeHistoryDepth: level };
				window.history.pushState(state, "");
			}
		} else {
			ignoreNextPopStateRef.current = true;
			window.history.go(depth - currentDepthRef.current);
		}
		currentDepthRef.current = depth;
	}, [depth]);

	useEffect(() => {
		function handlePopState(event: PopStateEvent) {
			if (ignoreNextPopStateRef.current) {
				ignoreNextPopStateRef.current = false;
				return;
			}
			const state = event.state as HistoryDepthState | null;
			const newDepth = state?.cascadeHistoryDepth ?? 0;
			currentDepthRef.current = newDepth;
			onDepthChangeRef.current(newDepth);
		}

		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, []);
}
