import { enabledOutlinerFeatures } from "@cascade/outliner/features";
import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import {
	activeDueDateRange,
	filtersForCapabilities,
	hasActiveDueDateFilter,
} from "@cascade/outliner/node-filters";
import { TreeSkeleton } from "@cascade/outliner/tree-skeleton";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useMemo } from "react";
import { GenericErrorComponent } from "@/app/generic-error";
import {
	useDelayedCompletionHide,
	withPendingTasksIncomplete,
} from "@/features/nodes/client/filters/use-delayed-completion-hide";
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
import { renderEmbeddedBoard } from "@/features/nodes/ui/board/embedded-board";
import { NodeLink } from "@/features/nodes/ui/node-link";
import {
	useNodeCapabilities,
	useSettings,
} from "@/features/settings/client/settings-context";

export const Route = createFileRoute("/_authed/")({
	loader: ({ context: { queryClient } }) => {
		queryClient.prefetchQuery(visibleTreeOptions());
		queryClient.prefetchQuery(existingTagsOptions());
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
	const capabilities = useNodeCapabilities();
	const features = useMemo(
		() =>
			enabledOutlinerFeatures(capabilities).filter(
				(feature) => feature.id !== "status",
			),
		[capabilities],
	);
	const filterCapabilities = useMemo(() => {
		const next = new Set(capabilities);
		next.delete("status");
		return next;
	}, [capabilities]);
	const [rawFilters, setFilters] = useNodeFilters(
		settings.hideCompletedByDefault,
	);
	const filters = filtersForCapabilities(rawFilters, filterCapabilities);
	const includeCollapsedDescendants = hasActiveDueDateFilter(filters);
	const dueDateRange = activeDueDateRange(filters);
	const tree = useVisibleTree(
		null,
		includeCollapsedDescendants,
		undefined,
		capabilities.has("board"),
	);
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

	return (
		<VirtualTree
			tree={tree}
			className="h-full"
			indentSize={settings.indentSize}
			features={features}
			capabilities={filterCapabilities}
			renderNodeLink={(node) => (
				<NodeLink id={node.id} content={node.content} />
			)}
			renderBoard={renderEmbeddedBoard}
			contentClassName="rr-block"
			header={
				<FiltersBar
					filters={filters}
					existingTags={existingTags}
					onFiltersChange={setFilters}
					completedFilterMode={
						settings.hideCompletedByDefault ? "show" : "hide"
					}
					capabilities={capabilities}
				/>
			}
			hiddenRowIds={visibility.hiddenIds}
			completionExitRowIds={completionHide.exitingIds}
			contextRowIds={visibility.contextIds}
			noVisibleChildrenRowIds={visibility.noVisibleChildrenIds}
			newNodeDueDate={dueDateRange ? dueDateRange.start : undefined}
			newNodeTags={filters.tags.length > 0 ? filters.tags : undefined}
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
