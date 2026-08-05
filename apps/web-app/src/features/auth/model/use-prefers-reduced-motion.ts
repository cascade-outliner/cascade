import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
	return (
		typeof matchMedia !== "undefined" &&
		matchMedia(REDUCED_MOTION_QUERY).matches
	);
}

function subscribe(onStoreChange: () => void): () => void {
	if (typeof matchMedia === "undefined") return () => undefined;
	const media = matchMedia(REDUCED_MOTION_QUERY);
	media.addEventListener("change", onStoreChange);
	return () => media.removeEventListener("change", onStoreChange);
}

export function usePrefersReducedMotion(): boolean {
	return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
