import { OutlineStore, type SyncStatus } from "@cascade/data";
import { useSyncExternalStore } from "react";
import { createSync, type Sync } from "#/lib/sync.ts";
import type { SyncConfig } from "#/server/sync.ts";

let instance: { store: OutlineStore; sync: Sync } | undefined;
let loading: Promise<void> | undefined;

function outline() {
	if (!instance) {
		const sync = createSync();
		instance = { store: new OutlineStore(sync.persistence), sync };
	}
	return instance;
}

/**
 * Resolves once the local copy is loaded and the first pull settled (or failed),
 * so the outline doesn't jump when server changes arrive. Memoized: the `_app`
 * loader re-runs on navigation.
 */
export function loadOutline(): Promise<void> {
	if (!loading) {
		const { store, sync } = outline();
		const timeout = new Promise((resolve) => setTimeout(resolve, 5_000));
		loading = Promise.race([Promise.all([store.ready, sync.start()]), timeout])
			.then(() => {})
			.catch((error) => console.error("Outline: loading failed", error));
	}
	return loading;
}

export function useOutlineStore(): OutlineStore {
	return outline().store;
}

export function useSync(): Sync {
	return outline().sync;
}

export function useSyncStatus(): SyncStatus {
	const { engine } = useSync();
	return useSyncExternalStore(
		(listener) => engine.subscribeStatus(listener),
		() => engine.status,
	);
}

/** The server's sync config, or `null` until the first request answered. */
export function useSyncConfig(): SyncConfig | null {
	const sync = useSync();
	return useSyncExternalStore(
		(listener) => sync.subscribeConfig(listener),
		() => sync.config,
	);
}
