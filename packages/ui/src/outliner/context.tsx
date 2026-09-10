import type { OutlineNode } from "@cascade/data";
import { createContext, useContext } from "react";

export interface ItemContextValue {
	node: OutlineNode;
	depth: number;
}

export const ItemContext = createContext<ItemContextValue | null>(null);

export function useItem(): ItemContextValue {
	const ctx = useContext(ItemContext);
	if (!ctx)
		throw new Error(
			"Outliner.Content must be rendered inside Outliner.VirtualList",
		);
	return ctx;
}
