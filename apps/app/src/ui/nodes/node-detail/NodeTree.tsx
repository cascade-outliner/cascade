import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import type { ReactNode } from "react";
import { NodeLink } from "#/ui/nodes/node-link";
import { useDeleteTag, useExistingTags } from "#/ui/nodes/use-existing-tags";
import { useNodeFilters } from "#/ui/nodes/use-node-filters";
import { useVisibleTree } from "#/ui/nodes/virtual-tree/data/use-visible-tree";
import { useSettings } from "#/ui/settings-context";

export function NodeTree({
	nodeId,
	header,
}: {
	nodeId: string;
	header: ReactNode;
}) {
	const tree = useVisibleTree(nodeId);
	const { settings } = useSettings();
	const [filters, setFilters] = useNodeFilters();
	const visibility = getRowVisibility(tree.rows, filters);
	const existingTags = useExistingTags();
	const deleteTag = useDeleteTag();

	return (
		<VirtualTree
			tree={tree}
			indentSize={settings.indentSize}
			renderNodeLink={(node) => (
				<NodeLink id={node.id} content={node.content} />
			)}
			header={
				<>
					{header}
					<FiltersBar filters={filters} onFiltersChange={setFilters} />
				</>
			}
			hiddenRowIds={visibility.hiddenIds}
			contextRowIds={visibility.contextIds}
			newNodeDueDate={filters.dueToday ? new Date() : undefined}
			existingTags={existingTags}
			onDeleteTag={deleteTag}
		/>
	);
}
