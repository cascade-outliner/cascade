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
		// A local Suspense fallback, not the route's `pendingComponent`
		// (removed in #629/#630 because it interrupted the cross-fade with an
		// unrelated full-page loader): this one only ever appears as the
		// transition's own "new" content, for the rare case where this route's
		// own render still needs a moment (e.g. a code-split chunk that wasn't
		// already warm) after the router considers the navigation ready.
		return (
			<Suspense fallback={<TreeSkeleton />}>
				<NodeDetailPage nodeId={nodeId} />
			</Suspense>
		);
	},
});
