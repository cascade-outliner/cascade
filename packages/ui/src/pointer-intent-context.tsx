import { createContext, useContext } from "react";

export interface PointerIntentCandidate {
	id: string;
	element: HTMLElement;
	/** Obstacles (e.g. a drag handle) compete for space but are never a redirect target. */
	activatable: boolean;
}

export interface PointerIntentScope {
	/** Registers a candidate for the lifetime of the caller's effect; returns the unregister function. */
	register: (candidate: PointerIntentCandidate) => () => void;
}

export const PointerIntentContext = createContext<PointerIntentScope | null>(
	null,
);

export function usePointerIntentContext(): PointerIntentScope | null {
	return useContext(PointerIntentContext);
}
