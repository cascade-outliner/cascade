import { useSyncExternalStore } from "react";

const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
	return (
		typeof matchMedia !== "undefined" && matchMedia(DARK_MODE_QUERY).matches
	);
}

function subscribe(onStoreChange: () => void): () => void {
	if (typeof matchMedia === "undefined") return () => undefined;
	const media = matchMedia(DARK_MODE_QUERY);
	media.addEventListener("change", onStoreChange);
	return () => media.removeEventListener("change", onStoreChange);
}

export function useSystemPrefersDark(): boolean {
	return useSyncExternalStore(subscribe, systemPrefersDark, () => false);
}
