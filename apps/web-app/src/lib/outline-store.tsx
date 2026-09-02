import {
	createOutline,
	type Outline,
	type OutlineStore,
	type SyncClient,
} from "@cascade/data";
import { enableStaticRendering } from "mobx-react-lite";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

enableStaticRendering(typeof window === "undefined");

const OutlineContext = createContext<Outline | null>(null);

export function OutlineProvider({ children }: { children: ReactNode }) {
	const [outline] = useState(() => createOutline());

	useEffect(() => {
		void outline.sync.start();
		return () => outline.sync.stop();
	}, [outline]);

	return (
		<OutlineContext.Provider value={outline}>
			{children}
		</OutlineContext.Provider>
	);
}

export function useOutline(): Outline {
	const outline = useContext(OutlineContext);
	if (!outline) {
		throw new Error("useOutline must be used within an OutlineProvider");
	}
	return outline;
}

export function useOutlineStore(): OutlineStore {
	return useOutline().store;
}

export function useSyncClient(): SyncClient {
	return useOutline().sync;
}
