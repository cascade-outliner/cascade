import { Link } from "@tanstack/react-router";
import type { NodeType } from "#/db/schema";
import { NodeList } from "#/ui/patterns/node-list/node-list";

export function NodeItem({
	node,
	allNodes,
	withTransition,
}: {
	node: NodeType;
	allNodes: NodeType[];
	withTransition?: boolean;
}) {
	return (
		<div className="group py-1">
			<div className="flex items-center gap-2">
				<Link
					to="/node/$nodeId"
					params={{ nodeId: node.id }}
					viewTransition
					className="w-2 h-2 rounded-full bg-gray-400 hover:bg-black transition-colors"
				/>

				<div
					className="flex-1 outline-none wrap-break-word"
					style={withTransition ? { viewTransitionName: `node-text-${node.id}` } : undefined}
				>
					{node.text}
				</div>
			</div>

			<NodeList nodes={allNodes} parentId={node.id} />
		</div>
	);
}
