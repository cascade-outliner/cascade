import { useSyncExternalStore } from "react";

function subscribe(query: string, onChange: () => void): () => void {
	const mql = window.matchMedia(query);
	mql.addEventListener("change", onChange);
	return () => mql.removeEventListener("change", onChange);
}

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(onChange) => subscribe(query, onChange),
		() => window.matchMedia(query).matches,
		() => false,
	);
}
