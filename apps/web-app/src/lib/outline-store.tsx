import {
	createOutlinePersistence,
	type OutlinePersistence,
	OutlineStore,
} from "@cascade/data";
import { enableStaticRendering } from "mobx-react-lite";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

// The store is mutated outside of React re-renders; without this, `observer`
// components leak subscriptions across requests on the server.
enableStaticRendering(typeof window === "undefined");

const OutlineStoreContext = createContext<OutlineStore | null>(null);

/**
 * Owns the store and picks its backend. `persistence` is the injection point:
 * pass `memoryPersistence()` in a test, or a server-backed adapter later,
 * without any component below knowing the difference. The default is IndexedDB
 * in the browser and memory on the server.
 */
export function OutlineStoreProvider({
	children,
	persistence,
}: {
	children: ReactNode;
	persistence?: OutlinePersistence;
}) {
	const [store] = useState(
		// Constructing an adapter is inert - nothing opens a database until the
		// first read or write - so this is safe during SSR.
		() => new OutlineStore(persistence ?? createOutlinePersistence()),
	);

	useEffect(() => {
		void store.hydrate();
	}, [store]);

	useEffect(() => {
		// Writes are coalesced, so the last few edits can still be in the window
		// when the tab goes away. `pagehide` and a hidden `visibilitychange` are
		// the two moments mobile browsers actually deliver; `beforeunload` is not.
		function flush() {
			void store.flush();
		}
		function flushWhenHidden() {
			if (document.visibilityState === "hidden") {
				flush();
			}
		}

		window.addEventListener("pagehide", flush);
		document.addEventListener("visibilitychange", flushWhenHidden);
		return () => {
			window.removeEventListener("pagehide", flush);
			document.removeEventListener("visibilitychange", flushWhenHidden);
			flush();
		};
	}, [store]);

	return (
		<OutlineStoreContext.Provider value={store}>
			{children}
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
