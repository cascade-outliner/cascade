import type { BoardDropResult } from "@cascade/outliner/board-types";
import { BoardView } from "@cascade/outliner/board-view";
import { enabledOutlinerFeatures } from "@cascade/outliner/features";
import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import type { BlockType } from "@cascade/outliner/lexical-content";
import { setBlockType } from "@cascade/outliner/lexical-content";
import {
	filtersForCapabilities,
	hasActiveDueDateFilter,
} from "@cascade/outliner/node-filters";
import {
	defaultTypedMetadata,
	type NodeTypeName,
} from "@cascade/outliner/node-types";
import { CircleDashedIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
	useDelayedCompletionHide,
	withPendingTasksIncomplete,
} from "#/features/nodes/client/filters/use-delayed-completion-hide";
import { useNodeFilters } from "#/features/nodes/client/filters/use-node-filters";
import {
	useExistingStatuses,
	useStatusManagement,
} from "#/features/nodes/client/statuses/use-existing-statuses";
import {
	useDeleteTag,
	useExistingTags,
} from "#/features/nodes/client/tags/use-existing-tags";
import { useVisibleTree } from "#/features/nodes/client/tree/use-visible-tree";
import { NodeLink } from "#/features/nodes/ui/node-link";
import { BoardSettingsDialog } from "#/features/nodes/ui/status-settings";
import {
	useNodeCapabilities,
	useSettings,
} from "#/features/settings/client/settings-context";
import { m } from "#/paraglide/messages.js";

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
	const capabilities = useNodeCapabilities();
	const features = useMemo(
		() => enabledOutlinerFeatures(capabilities),
		[capabilities],
	);
	// Reads the same URL-synced filter state the outline's own FiltersBar
	// writes to (see `useNodeFilters`) — so a board embedded inline in an
	// already-filtered outline (or a board's own detail page, reached with
	// filters still in the URL) hides/shows its cards the same way the tree
	// would, instead of always showing every card regardless of active
	// filters (see #455 follow-up).
	const [rawFilters, setFilters] = useNodeFilters(
		settings.hideCompletedByDefault,
	);
	const filters = filtersForCapabilities(rawFilters, capabilities);
	const includeCollapsedDescendants = hasActiveDueDateFilter(filters);
	const tree = useVisibleTree(nodeId, includeCollapsedDescendants, nodeId);
	const completionHide = useDelayedCompletionHide(
		tree.rows,
		filters.hideCompleted,
	);
	const visibility = getRowVisibility(
		withPendingTasksIncomplete(tree.rows, completionHide.pendingIds),
		filters,
	);
	const existingStatuses = useExistingStatuses(nodeId);
	const { updateStatus } = useStatusManagement(nodeId);
	const existingTags = useExistingTags();
	const deleteTag = useDeleteTag();
	const [manageColumnsOpen, setManageColumnsOpen] = useState(false);
	const directChildren = useMemo(
		() =>
			tree.rows
				.filter((row) => row.depth === 0 && !visibility.hiddenIds.has(row.id))
				.map((row) =>
					capabilities.has("status") ? row : { ...row, status: null },
				),
		[tree.rows, visibility.hiddenIds, capabilities],
	);

	function handleDrop(draggedId: string, result: BoardDropResult) {
		const draggedRow = tree.rows.find((row) => row.id === draggedId);
		if (
			capabilities.has("status") &&
			draggedRow &&
			(draggedRow.status?.id ?? null) !== result.statusId
		) {
			tree.setStatus(draggedId, result.statusId);
		}
		tree.move(draggedId, result.target);
	}

	async function handleAddCard(columnStatusId: string | null) {
		const id = await tree.add();
		if (id && capabilities.has("status") && columnStatusId !== null) {
			tree.setStatus(id, columnStatusId);
		}
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
			existingStatuses={capabilities.has("status") ? existingStatuses : []}
			existingTags={existingTags}
			features={features}
			capabilities={capabilities}
			header={
				<>
					{header}
					{capabilities.has("status") && (
						<div className="mb-4 flex justify-end">
							<button
								type="button"
								onClick={() => setManageColumnsOpen(true)}
								className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-muted outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50 dark:hover:bg-surface/10 dark:hover:text-surface"
							>
								<CircleDashedIcon size={14} weight="bold" />
								{m.board_manage_columns()}
							</button>
						</div>
					)}
					{capabilities.has("status") && (
						<BoardSettingsDialog
							boardId={nodeId}
							open={manageColumnsOpen}
							onOpenChange={setManageColumnsOpen}
						/>
					)}
				</>
			}
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
			onToggleColumnHidden={(statusId, hidden) =>
				updateStatus(statusId, { hidden }, () => {})
			}
			className={className}
		/>
	);
}
