import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import {
	activeDueDateRange,
	hasActiveDueDateFilter,
} from "@cascade/outliner/node-filters";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericErrorComponent } from "@/app/generic-error";
import { useNodeFilters } from "@/features/nodes/client/filters/use-node-filters";
import {
	existingTagsOptions,
	useDeleteTag,
	useExistingTags,
} from "@/features/nodes/client/tags/use-existing-tags";
import {
	useVisibleTree,
	visibleTreeOptions,
} from "@/features/nodes/client/tree/use-visible-tree";
import { NodeLink } from "@/features/nodes/ui/node-link";
import { useSettings } from "@/features/settings/client/settings-context";

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
	const includeCollapsedDescendants = hasActiveDueDateFilter(filters);
	const dueDateRange = activeDueDateRange(filters);
	const tree = useVisibleTree(null, includeCollapsedDescendants, dueDateRange);
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
			header={
				<FiltersBar
					filters={filters}
					existingTags={existingTags}
					onFiltersChange={setFilters}
				/>
			}
			hiddenRowIds={visibility.hiddenIds}
			contextRowIds={visibility.contextIds}
			newNodeDueDate={filters.dueToday ? new Date() : undefined}
			existingTags={existingTags}
			onDeleteTag={deleteTag}
			onTagClick={(tag) =>
				setFilters({
					...filters,
					tags: filters.tags.some(
						(name) => name.toLowerCase() === tag.toLowerCase(),
					)
						? filters.tags
						: [...filters.tags, tag],
				})
			}
		/>
	);
}
