import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import { NodeLink } from "@/ui/nodes/node-link";
import {
	useVisibleTree,
	visibleTreeOptions,
} from "@/ui/nodes/virtual-tree/use-visible-tree";
import { useSettings } from "@/ui/settings-context";

export const Route = createFileRoute("/")({
	loader: ({ context: { queryClient } }) => {
		queryClient.prefetchQuery(visibleTreeOptions(null));
	},
	errorComponent: GenericErrorComponent,
	component: () => (
		<Suspense fallback={<CascadeLoader />}>
			<RootTree />
		</Suspense>
	),
});

function RootTree() {
	const tree = useVisibleTree(null);
	const { settings } = useSettings();
	return (
		<VirtualTree
			tree={tree}
			indentSize={settings.indentSize}
			renderNodeLink={(id) => <NodeLink id={id} />}
			contentClassName="rr-block"
			hideCompletedTasks={settings.hideCompletedTasks}
		/>
	);
}
