import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import {
	activeDueDateRange,
	hasActiveDueDateFilter,
} from "@cascade/outliner/node-filters";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { ShareIcon } from "@phosphor-icons/react/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
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
import { NodeLink } from "@/features/nodes/ui/node-link";
import { useSettings } from "@/features/settings/client/settings-context";
import { ShareDialog } from "@/features/sharing/ui/share-dialog";
import { m } from "@/paraglide/messages.js";

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
	const [filters, setFilters] = useNodeFilters(settings.hideCompletedByDefault);
	const includeCollapsedDescendants = hasActiveDueDateFilter(filters);
	const dueDateRange = activeDueDateRange(filters);
	const tree = useVisibleTree(null, includeCollapsedDescendants, dueDateRange);
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
	const [shareOpen, setShareOpen] = useState(false);
	// The trailing "add node" control's Share fan action targets whichever
	// node currently sits at the top of the outline; disabled until one exists.
	const firstRootId = tree.rows.find((row) => row.depth === 0)?.id ?? null;

	return (
		<>
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
						completedFilterMode={
							settings.hideCompletedByDefault ? "show" : "hide"
						}
					/>
				}
				hiddenRowIds={visibility.hiddenIds}
				completionExitRowIds={completionHide.exitingIds}
				contextRowIds={visibility.contextIds}
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
				addNodeActions={[
					{
						icon: <ShareIcon size={16} weight="bold" />,
						label: m.sharing_dialog_title(),
						onClick: () => setShareOpen(true),
						disabled: !firstRootId,
					},
				]}
			/>
			{firstRootId && (
				<ShareDialog
					nodeId={firstRootId}
					open={shareOpen}
					onOpenChange={setShareOpen}
				/>
			)}
		</>
	);
}
