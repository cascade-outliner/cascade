import type { NodeType } from "#/core/nodes/node.types";
import { NodeLink } from "#/ui/Nodes/node-link";
import { NodeText } from "#/ui/Nodes/node-text";

export interface NodeProps extends NodeType {}

export function Node({ node }: { node: NodeProps }) {
	return (
		<div className="group/node py-1 flex items-center gap-2">
			<NodeLink id={node.id} />

			<div className="flex-1 flex items-center gap-2 min-w-0">
				<NodeText text={node.text} />
			</div>
		</div>
	);
}
