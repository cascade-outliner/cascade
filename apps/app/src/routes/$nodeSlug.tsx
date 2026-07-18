import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "#/orpc/client";
import { GenericErrorComponent } from "#/ui/error/generic-error";
import { loadNodeDetail, NodeDetailPage } from "#/ui/nodes/node-detail";
import { splitNodeSlug } from "#/ui/nodes/node-slug";

export const Route = createFileRoute("/$nodeSlug")({
	loader: async ({ context: { queryClient }, params: { nodeSlug } }) => {
		const { slugId, slugText } = splitNodeSlug(nodeSlug);
		const { id: nodeId } = await queryClient.ensureQueryData(
			orpc.nodes.resolveSlug.queryOptions({ input: { slugId, slugText } }),
		);
		await loadNodeDetail(queryClient, nodeId);
		return { nodeId };
	},
	pendingComponent: CascadeLoader,
	pendingMinMs: 200,
	errorComponent: GenericErrorComponent,
	component: () => {
		const { nodeId } = Route.useLoaderData();
		return <NodeDetailPage nodeId={nodeId} />;
	},
});
