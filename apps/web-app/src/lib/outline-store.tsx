import { IdbPersistence, OutlineStore } from "@cascade/data";
import { createContext, type ReactNode, useContext, useState } from "react";

const OutlineStoreContext = createContext<OutlineStore | null>(null);

export function OutlineStoreProvider({ children }: { children: ReactNode }) {
	const [store] = useState(() => new OutlineStore(new IdbPersistence()));

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
