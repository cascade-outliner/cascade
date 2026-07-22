import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import {
	activeDueDateRange,
	hasActiveDueDateFilter,
} from "@cascade/outliner/node-filters";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { type ReactNode, useState } from "react";
import { NodeLink } from "#/ui/nodes/node-link";
import { useDeleteTag, useExistingTags } from "#/ui/nodes/use-existing-tags";
import { useNodeFilters } from "#/ui/nodes/use-node-filters";
import { VersionHistoryModal } from "#/ui/nodes/version-history-modal";
import {
	useVisibleTree,
	visibleTreeOptions,
} from "#/ui/nodes/virtual-tree/data/use-visible-tree";
import { useSettings } from "#/ui/settings-context";

export function NodeTree({
	nodeId,
	header,
}: {
	nodeId: string;
	header: ReactNode;
}) {
	const { settings } = useSettings();
	const [filters, setFilters] = useNodeFilters();
	const includeCollapsedDescendants = hasActiveDueDateFilter(filters);
	const dueDateRange = activeDueDateRange(filters);
	const tree = useVisibleTree(
		nodeId,
		includeCollapsedDescendants,
		dueDateRange,
	);
	const visibility = getRowVisibility(tree.rows, filters);
	const existingTags = useExistingTags();
	const deleteTag = useDeleteTag();
	const [historyNodeId, setHistoryNodeId] = useState<string | null>(null);

	return (
		<>
			<VirtualTree
				tree={tree}
				className="h-full"
				indentSize={settings.indentSize}
				renderNodeLink={(node) => (
					<NodeLink id={node.id} content={node.content} />
				)}
				header={
					<>
						{header}
						<FiltersBar
							filters={filters}
							existingTags={existingTags}
							onFiltersChange={setFilters}
						/>
					</>
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
				onOpenVersionHistory={setHistoryNodeId}
			/>
			<VersionHistoryModal
				nodeId={historyNodeId}
				onOpenChange={(open) => {
					if (!open) setHistoryNodeId(null);
				}}
				treeQueryKey={
					visibleTreeOptions(nodeId, includeCollapsedDescendants, dueDateRange)
						.queryKey
				}
			/>
		</>
	);
}
