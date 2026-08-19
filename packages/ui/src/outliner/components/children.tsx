import { cva } from "cva";
import { useItem } from "../context";
import { Row } from "./row";

const children = cva({ base: "flex flex-col" });

export interface ChildrenProps {
	className?: string;
}

export function Children({ className }: ChildrenProps) {
	const { node, depth } = useItem();

	return (
		<div className={children({ className })} style={{ paddingLeft: 20 }}>
			{node.children.map((child) =>
				<Row key={child.id} node={child} depth={depth + 1} />,
			)}
		</div>
	);
}
