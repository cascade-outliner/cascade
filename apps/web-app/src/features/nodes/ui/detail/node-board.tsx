import type { BoardDropResult } from "@cascade/outliner/board-types";
import { BoardView } from "@cascade/outliner/board-view";
import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import type { BlockType } from "@cascade/outliner/lexical-content";
import { setBlockType } from "@cascade/outliner/lexical-content";
import { hasActiveDueDateFilter } from "@cascade/outliner/node-filters";
import {
	defaultTypedMetadata,
	type NodeTypeName,
} from "@cascade/outliner/node-types";
import type { ReactNode } from "react";
import { useMemo } from "react";
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
import { NodeLink } from "#/features/nodes/ui/node-link";
import { useSettings } from "#/features/settings/client/settings-context";

export function NodeBoard({
	nodeId,
	header,
	className = "h-full",
}: {
	nodeId: string;
	header?: ReactNode;
	/** Overrides the full-viewport-height default so this can also render
	 * embedded inline in an outline row (see `renderEmbeddedBoard`), where
	 * `h-dvh` would blow the row out to full screen height. */
	className?: string;
}) {
	const { settings } = useSettings();
	// Reads the same URL-synced filter state the outline's own FiltersBar
	// writes to (see `useNodeFilters`) — so a board embedded inline in an
	// already-filtered outline (or a board's own detail page, reached with
	// filters still in the URL) hides/shows its cards the same way the tree
	// would, instead of always showing every card regardless of active
	// filters (see #455 follow-up).
	const [filters, setFilters] = useNodeFilters(settings.hideCompletedByDefault);
	const includeCollapsedDescendants = hasActiveDueDateFilter(filters);
	const tree = useVisibleTree(nodeId, includeCollapsedDescendants);
	const completionHide = useDelayedCompletionHide(
		tree.rows,
		filters.hideCompleted,
	);
	const visibility = getRowVisibility(
		withPendingTasksIncomplete(tree.rows, completionHide.pendingIds),
		filters,
	);
	const existingStatuses = useExistingStatuses();
	const existingTags = useExistingTags();
	const deleteTag = useDeleteTag();
	const directChildren = useMemo(
		() =>
			tree.rows.filter(
				(row) => row.depth === 0 && !visibility.hiddenIds.has(row.id),
			),
		[tree.rows, visibility.hiddenIds],
	);

	function handleDrop(draggedId: string, result: BoardDropResult) {
		const draggedRow = tree.rows.find((row) => row.id === draggedId);
		if (draggedRow && (draggedRow.status?.id ?? null) !== result.statusId) {
			tree.setStatus(draggedId, result.statusId);
		}
		tree.move(draggedId, result.target);
	}

	async function handleAddCard(columnStatusId: string | null) {
		const id = await tree.add();
		if (id && columnStatusId !== null) tree.setStatus(id, columnStatusId);
	}

	function handleTurnInto(id: string, blockType: BlockType) {
		const row = tree.rows.find((candidate) => candidate.id === id);
		if (!row) return undefined;
		return tree.updateContent(id, setBlockType(row.content, blockType));
	}

	return (
		<BoardView
			rows={directChildren}
			rootId={nodeId}
			existingStatuses={existingStatuses}
			existingTags={existingTags}
			renderNodeLink={(node) => (
				<NodeLink id={node.id} content={node.content} />
			)}
			onToggleTask={(id, completed) => {
				const row = tree.rows.find((candidate) => candidate.id === id);
				tree.setTaskCompleted(id, completed, row?.dueDate ?? null);
			}}
			onSaveContent={(id, content) => tree.updateContent(id, content)}
			onSetDueDate={(id, date, time) => tree.setDueDate(id, date, time)}
			onSetRecurrence={(id, recurrence) => tree.setRecurrence(id, recurrence)}
			onSetTags={(id, tags) => tree.setTags(id, tags)}
			onSetPriority={(id, priority) => tree.setPriority(id, priority)}
			onSetStatus={(id, statusId) => tree.setStatus(id, statusId)}
			onSetIcon={(id, icon) => tree.setIcon(id, icon)}
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
			onDrop={handleDrop}
			onAddCard={handleAddCard}
			onConvert={(id, type: NodeTypeName) =>
				tree.setType(id, defaultTypedMetadata(type))
			}
			onTurnInto={handleTurnInto}
			onSetBoardView={(id, isBoard) => tree.setBoardView(id, isBoard)}
			onDuplicate={(id) => tree.duplicate(id)}
			onDelete={(id) => tree.remove(id)}
			header={header}
			className={className}
		/>
	);
}
