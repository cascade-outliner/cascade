import { useSyncExternalStore } from "react";

// Matches the `sm:` breakpoint the header switches on (app-header.styles.ts).
const MOBILE_DOCK_QUERY = "(max-width: 639.98px)";

function isMobileDockLayout(): boolean {
	return (
		typeof matchMedia !== "undefined" && matchMedia(MOBILE_DOCK_QUERY).matches
	);
}

function subscribe(onStoreChange: () => void): () => void {
	if (typeof matchMedia === "undefined") return () => undefined;
	const media = matchMedia(MOBILE_DOCK_QUERY);
	media.addEventListener("change", onStoreChange);
	return () => media.removeEventListener("change", onStoreChange);
}

/** Whether the header is currently showing the floating bottom action dock
 * (below `sm:`) instead of the inline bar. Used to make Agenda/Quick Open
 * non-modal on mobile only, so the dock stays reachable — including via
 * assistive tech, not just visually — while either is open. */
export function useMobileDockLayout(): boolean {
	return useSyncExternalStore(subscribe, isMobileDockLayout, () => false);
}
