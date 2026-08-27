import { OutlineStore } from "@cascade/data";
import { enableStaticRendering } from "mobx-react-lite";
import { createContext, type ReactNode, useContext, useState } from "react";

// The store is mutated outside of React re-renders; without this, `observer`
// components leak subscriptions across requests on the server.
enableStaticRendering(typeof window === "undefined");

const OutlineStoreContext = createContext<OutlineStore | null>(null);

export function OutlineStoreProvider({ children }: { children: ReactNode }) {
	const [store] = useState(() => new OutlineStore());
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
