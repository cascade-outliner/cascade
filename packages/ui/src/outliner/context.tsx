import { createContext, useContext } from "react";
import type { OutlineNode } from "./types";

export interface ItemContextValue {
	node: OutlineNode;
	depth: number;
}

export const ItemContext = createContext<ItemContextValue | null>(null);

export function useItem(): ItemContextValue {
	const ctx = useContext(ItemContext);
	if (!ctx)
		throw new Error("Outliner.Item parts must be used inside <Outliner.Item>");
	return ctx;
}
