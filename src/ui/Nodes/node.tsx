import { useQuery } from "@tanstack/react-query";
import type { NodeType } from "#/core/nodes/node.types";
import { sortByOrder } from "#/lib/node-sort";
import { orpc } from "#/orpc/client";
import { NodeLink } from "#/ui/Nodes/node-link";
import { NodeText } from "#/ui/Nodes/node-text";
import { NodeToggle } from "#/ui/Nodes/node-toggle";

export interface NodeProps extends NodeType {}

export function Node({ node }: { node: NodeProps }) {
	const { data: children } = useQuery({
		...orpc.listNodes.queryOptions({ input: { parentId: node.id } }),
		enabled: node.expanded && node.hasChildren,
	});

	return (
		<div>
			<div className="group/node py-1 flex items-center gap-2">
				<NodeToggle
					hasChildren={node.hasChildren}
					expanded={node.expanded}
					id={node.id}
					parentId={node.parentId}
				/>
				<NodeLink id={node.id} />

				<div className="flex-1 flex items-center gap-2 min-w-0">
					<NodeText text={node.text} />
				</div>
			</div>

			{node.expanded && children && (
				<div className="ml-4">
					{sortByOrder(children).map((child) => (
						<Node key={child.id} node={child} />
					))}
				</div>
			)}
		</div>
	);
}
