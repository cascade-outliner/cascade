import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { NodeType } from "#/core/nodes/node.types";
import { orpc } from "#/orpc/client";
import { NodeLink } from "#/ui/Nodes/node-link";
import { NodeText } from "#/ui/Nodes/node-text";
import { NodeToggle } from "#/ui/Nodes/node-toggle";

export interface NodeProps extends NodeType {
	hasChildren: boolean;
}

export function Node({ node }: { node: NodeProps }) {
	const [expanded, setExpanded] = useState(false);

	const { data: children } = useQuery({
		...orpc.listNodes.queryOptions({ input: { parentId: node.id } }),
		enabled: expanded && node.hasChildren,
	});

	return (
		<div>
			<div className="group/node py-1 flex items-center gap-2">
				<NodeToggle
					hasChildren={node.hasChildren}
					expanded={expanded}
					setExpanded={setExpanded}
				/>
				<NodeLink id={node.id} />

				<div className="flex-1 flex items-center gap-2 min-w-0">
					<NodeText text={node.text} />
				</div>
			</div>

			{expanded && children && (
				<div className="ml-4">
					{children.map((child) => (
						<Node key={child.id} node={child} />
					))}
				</div>
			)}
		</div>
	);
}
