import { OutlineStore, type SyncEngine, type SyncStatus } from "@cascade/data";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { setAppLoading } from "#/components/loading-screen.tsx";
import { createSync, type Sync } from "#/lib/sync.ts";

const OutlineStoreContext = createContext<OutlineStore | null>(null);
const SyncContext = createContext<Sync | null>(null);

export function OutlineStoreProvider({ children }: { children: ReactNode }) {
	// IndexedDB only exists in the browser.
	const [instance] = useState(() => {
		if (typeof window === "undefined") return null;
		const sync: Sync = createSync();
		return { store: new OutlineStore(sync.persistence), sync };
	});
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		if (!instance) return;
		const { store, sync } = instance;
		// Show the outline once the local copy is loaded and the first pull
		// settled (or failed), so it doesn't jump when server changes arrive.
		// ponytail: a hung request only delays the outline by the timeout.
		const timeout = new Promise((resolve) => setTimeout(resolve, 5_000));
		Promise.race([Promise.all([store.ready, sync.start()]), timeout])
			.catch((error) => console.error("Outline: loading failed", error))
			.finally(() => setLoaded(true));
		return () => sync.stop();
	}, [instance]);

	useLayoutEffect(() => {
		if (loaded) setAppLoading(false);
	}, [loaded]);

	if (!instance || !loaded) {
		return null;
	}
	return (
		<OutlineStoreContext.Provider value={instance.store}>
			<SyncContext.Provider value={instance.sync}>
				{children}
			</SyncContext.Provider>
		</OutlineStoreContext.Provider>
	);
}

export function useOutlineStore(): OutlineStore {
	const store = useContext(OutlineStoreContext);
	if (!store) {
		throw new Error(
			"useOutlineStore must be used within an OutlineStoreProvider",
		);
	}
	return store;
}

export function useSync(): Sync {
	const sync = useContext(SyncContext);
	if (!sync) {
		throw new Error("useSync must be used within an OutlineStoreProvider");
	}
	return sync;
}

export function useSyncEngine(): SyncEngine {
	return useSync().engine;
}

/** The engine's current status, re-rendering on change. `"disabled"` on the server. */
export function useSyncStatus(): SyncStatus {
	const engine = useSyncEngine();
	return useSyncExternalStore(
		(listener) => engine.subscribeStatus(listener),
		() => engine.status,
		() => "disabled",
	);
}
