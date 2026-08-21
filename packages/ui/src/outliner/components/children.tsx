import { cva } from "cva";
import { useItem } from "../context";
import type { OutlineNode } from "../types";

const style = cva({ base: "flex flex-col gap-1" });

export interface ChildrenProps {
	className?: string;
	children: (
		node: OutlineNode,
		depth: number,
		index: number,
	) => React.ReactNode;
}

export function Children({ className, children }: ChildrenProps) {
	const { node, depth } = useItem();

	if (node.children.length === 0) {
		return null;
	}

	return (
		<div className={style({ className })} style={{ paddingLeft: 20 }}>
			{node.children.map((child, index) => (
				<div key={child.id}>{children(child, depth + 1, index)}</div>
			))}
		</div>
	);
}
