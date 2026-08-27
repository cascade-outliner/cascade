import { createContext, useContext, useEffect, useState } from "react";
import "./mobx-config.ts";
import { NodeStore } from "./node-store.ts";

const StoreContext = createContext<NodeStore | null>(null);

export function useNodeStore(): NodeStore {
	const store = useContext(StoreContext);
	if (!store) {
		throw new Error("useNodeStore must be used inside <StoreProvider>");
	}
	return store;
}

/**
 * Owns the per-user store and gates rendering on it being loaded.
 *
 * IndexedDB does not exist on the server, so the fallback is what TanStack Start
 * renders during SSR. The first client render produces the same fallback -
 * effects run after mount - so there is no hydration mismatch.
 */
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

	// Signing in as a different user in the same tab must not inherit the
	// previous user's store.
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
