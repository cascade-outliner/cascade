import { IndexedDbPersistence, OutlineStore } from "@cascade/data";
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

export function OutlineStoreProvider({ children }: { children: ReactNode }) {
	// Constructed on the server too, where there is no IndexedDB: the adapter
	// no-ops there and the server renders the empty outline that the browser
	// then fills in.
	const [store] = useState(() => new OutlineStore(new IndexedDbPersistence()));

	// After hydration rather than during render: the stored outline is a
	// browser-only fact, and the server has no way to render it. Edits from here
	// on write themselves through - there is nothing to save on the way out.
	useEffect(() => {
		void store.hydrate();
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
