import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import {
	activeDueDateRange,
	hasActiveDueDateFilter,
} from "@cascade/outliner/node-filters";
import { TreeSkeleton } from "@cascade/outliner/tree-skeleton";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericErrorComponent } from "@/app/generic-error";
import {
	useDelayedCompletionHide,
	withPendingTasksIncomplete,
} from "@/features/nodes/client/filters/use-delayed-completion-hide";
import { useNodeFilters } from "@/features/nodes/client/filters/use-node-filters";
import {
	existingStatusesOptions,
	useExistingStatuses,
} from "@/features/nodes/client/statuses/use-existing-statuses";
import {
	existingTagsOptions,
	useDeleteTag,
	useExistingTags,
} from "@/features/nodes/client/tags/use-existing-tags";
import {
	useVisibleTree,
	visibleTreeOptions,
} from "@/features/nodes/client/tree/use-visible-tree";
import { renderEmbeddedBoard } from "@/features/nodes/ui/board/embedded-board";
import { NodeLink } from "@/features/nodes/ui/node-link";
import { useSettings } from "@/features/settings/client/settings-context";

export const Route = createFileRoute("/_authed/")({
	loader: ({ context: { queryClient } }) => {
		queryClient.prefetchQuery(visibleTreeOptions());
		queryClient.prefetchQuery(existingTagsOptions());
		queryClient.prefetchQuery(existingStatusesOptions());
	},
	errorComponent: GenericErrorComponent,
	component: () => (
		<Suspense fallback={<TreeSkeleton />}>
			<RootTree />
		</Suspense>
	),
});

function RootTree() {
	const { settings } = useSettings();
	const [filters, setFilters] = useNodeFilters(settings.hideCompletedByDefault);
	const includeCollapsedDescendants = hasActiveDueDateFilter(filters);
	const dueDateRange = activeDueDateRange(filters);
	const tree = useVisibleTree(null, includeCollapsedDescendants);
	const completionHide = useDelayedCompletionHide(
		tree.rows,
		filters.hideCompleted,
	);
	const visibility = getRowVisibility(
		withPendingTasksIncomplete(tree.rows, completionHide.pendingIds),
		filters,
	);
	const existingTags = useExistingTags();
	const deleteTag = useDeleteTag();
	const existingStatuses = useExistingStatuses();

	return (
		<VirtualTree
			tree={tree}
			className="h-full"
			indentSize={settings.indentSize}
			renderNodeLink={(node) => (
				<NodeLink id={node.id} content={node.content} />
			)}
			renderBoard={renderEmbeddedBoard}
			contentClassName="rr-block"
			header={
				<FiltersBar
					filters={filters}
					existingTags={existingTags}
					existingStatuses={existingStatuses}
					onFiltersChange={setFilters}
					completedFilterMode={
						settings.hideCompletedByDefault ? "show" : "hide"
					}
				/>
			}
			hiddenRowIds={visibility.hiddenIds}
			completionExitRowIds={completionHide.exitingIds}
			contextRowIds={visibility.contextIds}
			noVisibleChildrenRowIds={visibility.noVisibleChildrenIds}
			newNodeDueDate={dueDateRange ? dueDateRange.start : undefined}
			newNodeTags={filters.tags.length > 0 ? filters.tags : undefined}
			existingTags={existingTags}
			existingStatuses={existingStatuses}
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
