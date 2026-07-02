import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "#/orpc/client";
import {
	type LexicalElementNode,
	LexicalReadView,
} from "#/ui/Lexical/Read/lexical-read-view";
import { Node } from "#/ui/Nodes/node";

export const Route = createFileRoute("/node/$nodeId")({
	loader: ({ context: { queryClient }, params: { nodeId } }) =>
		Promise.all([
			queryClient.ensureQueryData(
				orpc.getNode.queryOptions({ input: { id: nodeId } }),
			),
			queryClient.ensureQueryData(
				orpc.listNodes.queryOptions({ input: { parentId: nodeId } }),
			),
		]),
	component: NodeDetailPage,
});

function NodeDetailPage() {
	const { nodeId } = Route.useParams();
	const { data: node } = useSuspenseQuery(
		orpc.getNode.queryOptions({ input: { id: nodeId } }),
	);
	const { data: children } = useSuspenseQuery(
		orpc.listNodes.queryOptions({ input: { parentId: nodeId } }),
	);

	if (!node) return <p>Node not found</p>;

	return (
		<div className="max-w-6xl mx-auto py-32">
			<div
				style={{ viewTransitionName: `node-${nodeId}` }}
				className="text-2xl mb-8"
			>
				<LexicalReadView
					// TODO: Improve type handling
					content={node.content as { root: LexicalElementNode }}
				/>
			</div>
			<div>
				{children.map((child) => (
					<Node key={child.id} node={child} />
				))}
			</div>
		</div>
	);
}
