import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import { NodeLink } from "@/ui/nodes/node-link";
import { useNodeFilters } from "@/ui/nodes/use-node-filters";
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
	const [filters, setFilters] = useNodeFilters();
	const visibility = getRowVisibility(tree.rows, filters);

	return (
		<VirtualTree
			tree={tree}
			indentSize={settings.indentSize}
			renderNodeLink={(node) => (
				<NodeLink id={node.id} content={node.content} />
			)}
			contentClassName="rr-block"
			header={<FiltersBar filters={filters} onFiltersChange={setFilters} />}
			hiddenRowIds={visibility.hiddenIds}
			contextRowIds={visibility.contextIds}
			newNodeDueDate={filters.dueToday ? new Date() : undefined}
		/>
	);
}
