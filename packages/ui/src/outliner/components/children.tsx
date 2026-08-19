import { cva } from "cva";
import { useItem } from "../context";
import type { OutlineNode } from "../types";

const style = cva({ base: "flex flex-col" });

export interface ChildrenProps {
	className?: string;
	children: (node: OutlineNode, depth: number) => React.ReactNode;
}

export function Children({ className, children }: ChildrenProps) {
	const { node, depth } = useItem();

	return (
		<div className={style({ className })} style={{ paddingLeft: 20 }}>
			{node.children.map((child) => (
				<div key={child.id}>{children(child, depth + 1)}</div>
			))}
		</div>
	);
}
