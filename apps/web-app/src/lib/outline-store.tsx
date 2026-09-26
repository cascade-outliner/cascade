import { OutlineStore, type SyncEngine, type SyncStatus } from "@cascade/data";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { createSync, type Sync } from "#/lib/sync.ts";

const OutlineStoreContext = createContext<OutlineStore | null>(null);
const SyncContext = createContext<Sync | null>(null);

export function OutlineStoreProvider({ children }: { children: ReactNode }) {
	const [{ store, sync }] = useState(() => {
		const sync: Sync = createSync();
		return { store: new OutlineStore(sync.persistence), sync };
	});

	useEffect(() => {
		void sync.start();
		return () => sync.stop();
	}, [sync]);

	return (
		<OutlineStoreContext.Provider value={store}>
			<SyncContext.Provider value={sync}>{children}</SyncContext.Provider>
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
