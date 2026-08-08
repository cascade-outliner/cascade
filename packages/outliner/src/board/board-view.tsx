import type { ReactNode } from "react";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import type { CalendarTimeString } from "../dates/calendar-time";
import type { RecurrenceInput } from "../dates/recurrence";
import type { BlockType } from "../editor/lexical/content/lexical-content";
import type { LexicalElementNode } from "../editor/lexical/model/lexical-node.types";
import type { NodeCapabilityId } from "../features/model/node-capabilities";
import type { OutlinerFeature } from "../features/model/outliner-feature.types";
import type { PriorityName } from "../nodes/model/node-priority";
import type { StatusOption } from "../nodes/model/node-statuses";
import type { TagSummary } from "../nodes/model/node-tags";
import type { NodeTypeName, VisibleNodeRow } from "../nodes/model/node-types";
import { BoardColumn } from "./components/board-column";
import type { BoardCardEdge } from "./drag-and-drop/use-board-card-drag-and-drop";
import type {
	BoardColumn as BoardColumnData,
	BoardDropResult,
} from "./model/board.types";
import { resolveCardDrop, resolveColumnDrop } from "./resolve-board-drop";

/**
 * Groups cards into columns, one per status (visible or hidden) plus an
 * always-first "unassigned" column. A hidden status still gets its own
 * column — `BoardColumn` renders it dimmed rather than dropping it — so
 * cards already carrying that status stay visible in place; only the "set
 * status" picker excludes hidden statuses as a pick target for new
 * assignments (see `BoardView`'s `pickableStatuses`).
 */
export function groupRowsIntoColumns(
	rows: VisibleNodeRow[],
	existingStatuses: StatusOption[],
): BoardColumnData[] {
	const byStatus = new Map<string | null, VisibleNodeRow[]>();
	for (const row of rows) {
		const key = row.status?.id ?? null;
		const list = byStatus.get(key);
		if (list) list.push(row);
		else byStatus.set(key, [row]);
	}
	const unassigned: BoardColumnData = {
		status: null,
		cards: byStatus.get(null) ?? [],
	};
	const statusColumns: BoardColumnData[] = existingStatuses.map((status) => ({
		status,
		cards: byStatus.get(status.id) ?? [],
	}));
	return [unassigned, ...statusColumns];
}

export interface BoardViewProps {
	/** The board's cards — expected to be a subtree root's direct children,
	 * already sibling-ordered (e.g. `useVisibleTree(rootId).rows` filtered to
	 * `depth === 0`). */
	rows: VisibleNodeRow[];
	/** The subtree root the cards are children of, used as `MoveTarget.parentId`. */
	rootId: string | null;
	/** All of this board's statuses (visible and hidden), in display order.
	 * Each gets its own column (a hidden one renders dimmed), plus an
	 * always-first "unassigned" column for cards without a status. */
	existingStatuses: StatusOption[];
	/** All of this user's tags with usage counts, for a card's tag editor. */
	existingTags: TagSummary[];
	renderNodeLink: (node: Pick<VisibleNodeRow, "id" | "content">) => ReactNode;
	/** Row/context-menu features a card renders — icon, task, due date,
	 * priority, status, tags by default (see `defaultOutlinerFeatures`),
	 * same as a tree row. */
	features?: OutlinerFeature[];
	capabilities?: ReadonlySet<NodeCapabilityId>;
	onToggleTask: (id: string, completed: boolean) => void;
	onSaveContent: (id: string, content: { root: LexicalElementNode }) => void;
	onSetDueDate: (
		id: string,
		date: Date | null,
		time: CalendarTimeString | null,
	) => void;
	onSetRecurrence: (id: string, recurrence: RecurrenceInput | null) => void;
	onSetTags: (id: string, tags: string[]) => void;
	onSetPriority: (id: string, priority: PriorityName | null) => void;
	onSetStatus: (id: string, statusId: string | null) => void;
	onSetIcon: (id: string, icon: string | null) => void;
	/** Handles clicking a tag pill on a card, e.g. to activate a filter. */
	onTagClick?: (tag: string) => void;
	/** Deletes a tag outright (every node that has it loses it), not just
	 * one card's use of it. Omit to hide the delete affordance. */
	onDeleteTag?: (name: string) => void | Promise<void>;
	/** A card was dropped into a (possibly different) column, at a specific
	 * position: `result.statusId` is the column's status and `result.target`
	 * is where among its new siblings it landed. */
	onDrop: (draggedId: string, result: BoardDropResult) => void;
	/** A column's "Add node" control was used; `columnStatusId` is the
	 * status the new node should be created with (`null` for the
	 * unassigned column). Omit to hide the control entirely. */
	onAddCard?: (columnStatusId: string | null) => void;
	/** A card's "Convert into"/duplicate/delete context menu — the same one
	 * a tree row has (see #455 follow-up). */
	onConvert: (id: string, type: NodeTypeName) => undefined | Promise<boolean>;
	onTurnInto: (
		id: string,
		blockType: BlockType,
	) => undefined | Promise<boolean>;
	onSetBoardView: (id: string, isBoard: boolean) => void;
	onDuplicate: (id: string) => void;
	onDelete: (id: string) => void;
	/** Toggles a status's hidden flag from its own column header. Omit to
	 * hide the toggle affordance (e.g. read-only contexts). */
	onToggleColumnHidden?: (statusId: string, hidden: boolean) => void;
	header?: ReactNode;
	className?: string;
}

/** Renders a subtree's direct children as draggable cards grouped into
 * columns by status (issue #455) — the board/kanban counterpart to the tree
 * view, for project-planning subtrees where workflow stage matters more
 * than nesting or position. */
export function BoardView({
	rows,
	rootId,
	existingStatuses,
	existingTags,
	renderNodeLink,
	features,
	capabilities,
	onToggleTask,
	onSaveContent,
	onSetDueDate,
	onSetRecurrence,
	onSetTags,
	onSetPriority,
	onSetStatus,
	onSetIcon,
	onTagClick,
	onDeleteTag,
	onDrop,
	onAddCard,
	onConvert,
	onTurnInto,
	onSetBoardView,
	onDuplicate,
	onDelete,
	onToggleColumnHidden,
	header,
	className,
}: BoardViewProps) {
	const columns = useMemo(
		() => groupRowsIntoColumns(rows, existingStatuses),
		[rows, existingStatuses],
	);
	// Hidden statuses are never offered as a pick target — only as a
	// possible existing state a card already carries (handled by folding
	// into the unassigned column above).
	const pickableStatuses = useMemo(
		() => existingStatuses.filter((status) => !status.hidden),
		[existingStatuses],
	);

	function handleCardDrop(
		draggedId: string,
		edge: BoardCardEdge,
		overCardId: string,
		columnStatusId: string | null,
	) {
		onDrop(
			draggedId,
			resolveCardDrop(edge, overCardId, columnStatusId, rootId),
		);
	}

	function handleColumnDrop(draggedId: string, columnStatusId: string | null) {
		onDrop(
			draggedId,
			resolveColumnDrop(draggedId, columnStatusId, columns, rootId),
		);
	}

	return (
		<div className={twMerge("isolate h-dvh overflow-auto", className)}>
			<div className="max-w-6xl mx-auto px-4 pt-16">{header}</div>
			<div className="flex items-start gap-4 overflow-x-auto px-4 pb-16">
				{columns.map((column) => (
					<BoardColumn
						key={column.status?.id ?? "unassigned"}
						column={column}
						renderNodeLink={renderNodeLink}
						features={features}
						capabilities={capabilities}
						existingTags={existingTags}
						existingStatuses={pickableStatuses}
						onToggleTask={onToggleTask}
						onSaveContent={onSaveContent}
						onSetDueDate={onSetDueDate}
						onSetRecurrence={onSetRecurrence}
						onSetTags={onSetTags}
						onSetPriority={onSetPriority}
						onSetStatus={onSetStatus}
						onSetIcon={onSetIcon}
						onTagClick={onTagClick}
						onDeleteTag={onDeleteTag}
						onCardDrop={handleCardDrop}
						onColumnDrop={handleColumnDrop}
						onAddCard={onAddCard}
						onConvert={onConvert}
						onTurnInto={onTurnInto}
						onSetBoardView={onSetBoardView}
						onDuplicate={onDuplicate}
						onDelete={onDelete}
						onToggleHidden={onToggleColumnHidden}
					/>
				))}
			</div>
		</div>
	);
}
