import { OutlineStore, type SyncEngine } from "@cascade/data";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { createSync, type Sync } from "#/lib/sync.ts";

const OutlineStoreContext = createContext<OutlineStore | null>(null);
const SyncEngineContext = createContext<SyncEngine | null>(null);

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
			<SyncEngineContext.Provider value={sync.engine}>
				{children}
			</SyncEngineContext.Provider>
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

export function useSyncEngine(): SyncEngine {
	const engine = useContext(SyncEngineContext);
	if (!engine) {
		throw new Error(
			"useSyncEngine must be used within an OutlineStoreProvider",
		);
	}
	return engine;
}
