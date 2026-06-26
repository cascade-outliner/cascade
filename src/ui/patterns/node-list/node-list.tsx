import { useMemo } from "react";
import type { NodeType } from "#/db/schema";
import { NodeItem } from "#/ui/patterns/node-item/node-item";

export function NodeList({
	nodes,
	parentId,
	withTransition,
}: {
	nodes: NodeType[];
	parentId?: string;
	withTransition?: boolean;
}) {
	const children = useMemo(() => {
		if (!parentId) return nodes;

		return nodes
			.filter((n) => n.parentId === parentId)
			.sort((a, b) => a.position - b.position);
	}, [nodes, parentId]);

	if (children.length === 0) return null;

	return (
		<div className="pl-4 border-l border-gray-200 ml-1">
			{children.map((child) => (
				<NodeItem key={child.id} node={child} allNodes={nodes} withTransition={withTransition} />
			))}
		</div>
	);
}
