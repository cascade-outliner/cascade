import { IndexedDbPersistence, OutlineStore } from "@cascade/data";
import { enableStaticRendering } from "mobx-react-lite";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

enableStaticRendering(typeof window === "undefined");

const OutlineStoreContext = createContext<OutlineStore | null>(null);

export function OutlineStoreProvider({ children }: { children: ReactNode }) {
	const [store] = useState(() => new OutlineStore(new IndexedDbPersistence()));

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
