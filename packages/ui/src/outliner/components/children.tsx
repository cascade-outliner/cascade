import { cva } from "cva";
import { useItem } from "../context";
import { mapSiblings, type SiblingRenderer } from "../lib/map-siblings";

const style = cva({ base: "flex flex-col gap-1" });

export interface ChildrenProps {
	className?: string;
	children: SiblingRenderer;
}

export function Children({ className, children }: ChildrenProps) {
	const { node, depth } = useItem();

	if (node.children.length === 0) {
		return null;
	}

	return (
		<div className={style({ className })} style={{ paddingLeft: 20 }}>
			{mapSiblings(node.children, depth + 1, children)}
		</div>
	);
}
