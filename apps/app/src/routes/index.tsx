import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import { visibleTreeOptions } from "@/ui/nodes/virtual-tree/use-visible-tree";
import { VirtualTree } from "@/ui/nodes/virtual-tree/virtual-tree";

export const Route = createFileRoute("/")({
	loader: ({ context: { queryClient } }) => {
		queryClient.prefetchQuery(visibleTreeOptions(null));
	},
	errorComponent: GenericErrorComponent,
	component: () => (
		<Suspense fallback={<CascadeLoader />}>
			<VirtualTree rootId={null} />
		</Suspense>
	),
});
