import { TreeSkeleton } from "@cascade/outliner/tree-skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericErrorComponent } from "@/app/generic-error";
import { AgendaPage } from "@/features/agenda/ui/agenda-page";
import { visibleTreeOptions } from "@/features/nodes/client/tree/visible-tree-query";

export const Route = createFileRoute("/_authed/agenda")({
	loader: ({ context: { queryClient } }) => {
		queryClient.prefetchQuery(visibleTreeOptions());
	},
	errorComponent: GenericErrorComponent,
	component: () => (
		<Suspense fallback={<TreeSkeleton />}>
			<AgendaPage />
		</Suspense>
	),
});
