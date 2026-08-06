import type { ReactNode } from "react";
import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import type { LexicalElementNode } from "../editor/lexical/model/lexical-node.types";
import type { StatusSummary } from "../nodes/model/node-statuses";
import type { VisibleNodeRow } from "../nodes/model/node-types";
import { BoardColumn } from "./components/board-column";
import type { BoardCardEdge } from "./drag-and-drop/use-board-card-drag-and-drop";
import type {
	BoardColumn as BoardColumnData,
	BoardDropResult,
} from "./model/board.types";
import { resolveCardDrop, resolveColumnDrop } from "./resolve-board-drop";

export function groupRowsIntoColumns(
	rows: VisibleNodeRow[],
	existingStatuses: StatusSummary[],
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
	/** All of this user's statuses, in display order, one column each — plus
	 * an always-first "unassigned" column for cards without a status. */
	existingStatuses: StatusSummary[];
	renderNodeLink: (node: Pick<VisibleNodeRow, "id" | "content">) => ReactNode;
	onToggleTask: (id: string, completed: boolean) => void;
	onSaveContent: (id: string, content: { root: LexicalElementNode }) => void;
	/** A card was dropped into a (possibly different) column, at a specific
	 * position: `result.statusId` is the column's status and `result.target`
	 * is where among its new siblings it landed. */
	onDrop: (draggedId: string, result: BoardDropResult) => void;
	/** A column's "Add card" control was used; `columnStatusId` is the
	 * status the new card should be created with (`null` for the
	 * unassigned column). Omit to hide the control entirely. */
	onAddCard?: (columnStatusId: string | null) => void;
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
	renderNodeLink,
	onToggleTask,
	onSaveContent,
	onDrop,
	onAddCard,
	header,
	className,
}: BoardViewProps) {
	const columns = useMemo(
		() => groupRowsIntoColumns(rows, existingStatuses),
		[rows, existingStatuses],
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
						onToggleTask={onToggleTask}
						onSaveContent={onSaveContent}
						onCardDrop={handleCardDrop}
						onColumnDrop={handleColumnDrop}
						onAddCard={onAddCard}
					/>
				))}
			</div>
		</div>
	);
}
