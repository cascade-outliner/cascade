import { cva } from "cva";
import { ItemContext } from "../context";
import type { OutlineNode } from "../types";

const item = cva({ base: "group/row flex flex-col gap-1" });

export interface ItemProps {
	node: OutlineNode;
	depth: number;
	children: React.ReactNode;
	className?: string;
}

export function Item({ node, depth, children, className }: ItemProps) {
	return (
		<ItemContext.Provider value={{ node, depth }}>
			<div className={item({ className })}>{children}</div>
		</ItemContext.Provider>
	);
}
