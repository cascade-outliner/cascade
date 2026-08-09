import type { BoardDropResult } from "@cascade/outliner/board-types";
import { enabledOutlinerFeatures } from "@cascade/outliner/features";
import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import type { BlockType } from "@cascade/outliner/lexical-content";
import { setBlockType } from "@cascade/outliner/lexical-content";
import {
	filtersForCapabilities,
	hasActiveDueDateFilter,
} from "@cascade/outliner/node-filters";
import { useMemo } from "react";
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
import {
	useNodeCapabilities,
	useSettings,
} from "#/features/settings/client/settings-context";

/**
 * Composes the tree/filter/status/tag data `NodeBoard` renders, and the
 * board-specific mutation handlers (drag/drop, add-card, turn-into) that
 * need the same `tree` instance — kept together so `NodeBoard` itself stays
 * a thin view-wiring component.
 */
export function useNodeBoard(nodeId: string) {
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

	return {
		tree,
		capabilities,
		features,
		filters,
		setFilters,
		directChildren,
		existingStatuses,
		existingTags,
		deleteTag,
		updateStatus,
		handleDrop,
		handleAddCard,
		handleTurnInto,
	};
}
