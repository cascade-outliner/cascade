import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "#/orpc/client";
import { NodeList } from "#/ui/patterns/node-list/node-list";

export const Route = createFileRoute("/node/$nodeId")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(orpc.listNodes.queryOptions());
	},
	component: NoteZoomPage,
});

function NoteZoomPage() {
	const { nodeId } = Route.useParams();
	const { data } = useSuspenseQuery(orpc.listNodes.queryOptions());
	const node = data.find((n) => n.id === nodeId);

	return (
		<div className="max-w-6xl mx-auto py-10">
			{node && (
				<div
					className="text-xl font-semibold mb-4"
					style={{ viewTransitionName: `node-text-${nodeId}` }}
				>
					{node.text}
				</div>
			)}
			<NodeList nodes={data} parentId={nodeId} withTransition />
		</div>
	);
}
