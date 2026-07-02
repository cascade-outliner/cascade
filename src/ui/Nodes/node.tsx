import { useQuery } from "@tanstack/react-query";
import type { NodeType } from "#/core/nodes/node.types";
import { orpc } from "#/orpc/client";
import { NodeActions } from "#/ui/Nodes/node-actions";
import { NodeEditor } from "#/ui/Nodes/node-editor";
import { NodeLink } from "#/ui/Nodes/node-link";
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

				<div
					className="inline-flex items-center gap-2 min-w-0"
					style={{ viewTransitionName: `node-${node.id}` }}
				>
					<NodeEditor node={node} />
					<NodeActions id={node.id} parentId={node.parentId} />
				</div>
			</div>

			{node.expanded && children && (
				<div className="ml-4">
					{children.map((child) => (
						<Node key={child.id} node={child} />
					))}
				</div>
			)}
		</div>
	);
}
