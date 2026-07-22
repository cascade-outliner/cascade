import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import {
	activeDueDateRange,
	hasActiveDueDateFilter,
} from "@cascade/outliner/node-filters";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import { NodeLink } from "@/ui/nodes/node-link";
import {
	existingTagsOptions,
	useDeleteTag,
	useExistingTags,
} from "@/ui/nodes/use-existing-tags";
import { useNodeFilters } from "@/ui/nodes/use-node-filters";
import { VersionHistoryModal } from "@/ui/nodes/version-history-modal";
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
	const includeCollapsedDescendants = hasActiveDueDateFilter(filters);
	const dueDateRange = activeDueDateRange(filters);
	const tree = useVisibleTree(null, includeCollapsedDescendants, dueDateRange);
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
				onOpenVersionHistory={setHistoryNodeId}
			/>
			<VersionHistoryModal
				nodeId={historyNodeId}
				onOpenChange={(open) => {
					if (!open) setHistoryNodeId(null);
				}}
				treeQueryKey={
					visibleTreeOptions(null, includeCollapsedDescendants, dueDateRange)
						.queryKey
				}
			/>
		</>
	);
}
