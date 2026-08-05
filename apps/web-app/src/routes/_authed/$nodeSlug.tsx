import { TreeSkeleton } from "@cascade/outliner/tree-skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericErrorComponent } from "#/app/generic-error";
import { loadNodeDetail, NodeDetailPage } from "#/features/nodes/ui/detail";

export const Route = createFileRoute("/_authed/$nodeSlug")({
	loader: async ({ context: { queryClient }, params: { nodeSlug } }) => {
		const nodeId = await loadNodeDetail(queryClient, nodeSlug);
		return { nodeId };
	},
	errorComponent: GenericErrorComponent,
	component: () => {
		const { nodeId } = Route.useLoaderData();
		
		return (
			<Suspense fallback={<TreeSkeleton />}>
				<NodeDetailPage nodeId={nodeId} />
			</Suspense>
		);
	},
});
