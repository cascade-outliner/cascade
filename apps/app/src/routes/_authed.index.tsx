import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import { hasActiveDueDateFilter } from "@cascade/outliner/node-filters";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import { NodeLink } from "@/ui/nodes/node-link";
import {
	existingTagsOptions,
	useDeleteTag,
	useExistingTags,
} from "@/ui/nodes/use-existing-tags";
import { useNodeFilters } from "@/ui/nodes/use-node-filters";
import {
	useVisibleTree,
	visibleTreeOptions,
} from "@/ui/nodes/virtual-tree/data/use-visible-tree";
import { useSettings } from "@/ui/settings-context";

export const Route = createFileRoute("/_authed/")({
	loader: ({ context: { queryClient } }) => {
		queryClient.prefetchQuery(visibleTreeOptions(null));
		queryClient.prefetchQuery(existingTagsOptions());
	},
	errorComponent: GenericErrorComponent,
	component: () => (
		<Suspense fallback={<CascadeLoader />}>
			<RootTree />
		</Suspense>
	),
});

function RootTree() {
	const { settings } = useSettings();
	const [filters, setFilters] = useNodeFilters();
	const tree = useVisibleTree(null, hasActiveDueDateFilter(filters));
	const visibility = getRowVisibility(tree.rows, filters);
	const existingTags = useExistingTags();
	const deleteTag = useDeleteTag();

	return (
		<VirtualTree
			tree={tree}
			className="h-full"
			indentSize={settings.indentSize}
			renderNodeLink={(node) => (
				<NodeLink id={node.id} content={node.content} />
			)}
			contentClassName="rr-block"
			header={<FiltersBar filters={filters} onFiltersChange={setFilters} />}
			hiddenRowIds={visibility.hiddenIds}
			contextRowIds={visibility.contextIds}
			newNodeDueDate={filters.dueToday ? new Date() : undefined}
			existingTags={existingTags}
			onDeleteTag={deleteTag}
		/>
	);
}
