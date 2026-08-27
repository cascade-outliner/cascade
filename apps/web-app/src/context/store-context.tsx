import { NodeStore } from "@cascade/data";
import { createContext, useContext, useEffect, useState } from "react";

const StoreContext = createContext<NodeStore | null>(null);

export function useNodeStore(): NodeStore {
	const store = useContext(StoreContext);
	if (!store) {
		throw new Error("useNodeStore must be used inside <StoreProvider>");
	}
	return store;
}

export function StoreProvider({
	userId,
	children,
	fallback = null,
}: {
	userId: string;
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	const [store, setStore] = useState(() => new NodeStore(userId));
	const [ready, setReady] = useState(false);

	if (store.userId !== userId) {
		setStore(new NodeStore(userId));
		setReady(false);
	}

	useEffect(() => {
		let cancelled = false;

		store.hydrate().then(
			() => {
				if (!cancelled) {
					setReady(true);
				}
			},
			(error: unknown) => {
				console.error("Failed to load nodes from IndexedDB", error);
			},
		);

		return () => {
			cancelled = true;
		};
	}, [store]);

	if (!ready) {
		return <>{fallback}</>;
	}

	return (
		<StoreContext.Provider value={store}>{children}</StoreContext.Provider>
	);
}
