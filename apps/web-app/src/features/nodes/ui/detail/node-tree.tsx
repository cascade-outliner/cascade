import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import {
	activeDueDateRange,
	hasActiveDueDateFilter,
} from "@cascade/outliner/node-filters";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import type { ReactNode } from "react";
import {
	useDelayedCompletionHide,
	withPendingTasksIncomplete,
} from "#/features/nodes/client/filters/use-delayed-completion-hide";
import { useNodeFilters } from "#/features/nodes/client/filters/use-node-filters";
import { useExistingStatuses } from "#/features/nodes/client/statuses/use-existing-statuses";
import {
	useDeleteTag,
	useExistingTags,
} from "#/features/nodes/client/tags/use-existing-tags";
import { useVisibleTree } from "#/features/nodes/client/tree/use-visible-tree";
import { renderEmbeddedBoard } from "#/features/nodes/ui/board/embedded-board";
import { NodeLink } from "#/features/nodes/ui/node-link";
import { useSettings } from "#/features/settings/client/settings-context";

export function NodeTree({
	nodeId,
	header,
}: {
	nodeId: string;
	header: ReactNode;
}) {
	const { settings } = useSettings();
	const [filters, setFilters] = useNodeFilters(settings.hideCompletedByDefault);
	const includeCollapsedDescendants = hasActiveDueDateFilter(filters);
	const dueDateRange = activeDueDateRange(filters);
	const tree = useVisibleTree(nodeId, includeCollapsedDescendants);
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
			header={
				<>
					<FiltersBar
						filters={filters}
						existingTags={existingTags}
						existingStatuses={existingStatuses}
						onFiltersChange={setFilters}
						completedFilterMode={
							settings.hideCompletedByDefault ? "show" : "hide"
						}
					/>
					{header}
				</>
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
