import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { sortByOrder } from "#/lib/node-sort";
import { orpc } from "#/orpc/client";
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
			<h1
				style={{ viewTransitionName: `node-${nodeId}` }}
				className="text-2xl font-semibold mb-8"
			>
				{node.text}
			</h1>
			<div>
				{sortByOrder(children ?? []).map((child) => (
					<Node key={child.id} node={child} />
				))}
			</div>
		</div>
	);
}
