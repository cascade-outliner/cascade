import { createFileRoute } from "@tanstack/react-router";
import { GenericErrorComponent } from "#/app/generic-error";
import { splitNodeSlug } from "#/features/nodes/model/node-slug";
import { loadNodeDetail, NodeDetailPage } from "#/features/nodes/ui/detail";
import { orpc } from "#/orpc/client";

export const Route = createFileRoute("/_authed/$nodeSlug")({
	loader: async ({ context: { queryClient }, params: { nodeSlug } }) => {
		const { slugId, slugText } = splitNodeSlug(nodeSlug);
		const { id: nodeId } = await queryClient.ensureQueryData(
			orpc.nodes.resolveSlug.queryOptions({ input: { slugId, slugText } }),
		);
		await loadNodeDetail(queryClient, nodeId);
		return { nodeId };
	},
	errorComponent: GenericErrorComponent,
	component: () => {
		const { nodeId } = Route.useLoaderData();
		return <NodeDetailPage nodeId={nodeId} />;
	},
});
