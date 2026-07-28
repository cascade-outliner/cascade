import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import {
	activeDueDateRange,
	hasActiveDueDateFilter,
} from "@cascade/outliner/node-filters";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import type { ReactNode } from "react";
import {
	revealPendingCompletions,
	useDelayedCompletionHide,
} from "#/features/nodes/client/filters/use-delayed-completion-hide";
import { useNodeFilters } from "#/features/nodes/client/filters/use-node-filters";
import {
	useDeleteTag,
	useExistingTags,
} from "#/features/nodes/client/tags/use-existing-tags";
import { useVisibleTree } from "#/features/nodes/client/tree/use-visible-tree";
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
	const tree = useVisibleTree(
		nodeId,
		includeCollapsedDescendants,
		dueDateRange,
	);
	const pendingHideIds = useDelayedCompletionHide(
		tree.rows,
		filters.hideCompleted,
	);
	const visibility = getRowVisibility(tree.rows, filters);
	const hiddenRowIds = revealPendingCompletions(
		visibility.hiddenIds,
		pendingHideIds,
		tree.rows,
	);
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
			header={
				<>
					<FiltersBar
						filters={filters}
						existingTags={existingTags}
						onFiltersChange={setFilters}
						completedFilterMode={
							settings.hideCompletedByDefault ? "show" : "hide"
						}
					/>
					{header}
				</>
			}
			hiddenRowIds={hiddenRowIds}
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
		/>
	);
}
