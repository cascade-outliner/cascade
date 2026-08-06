import type { MoveTarget } from "../tree/rows/visible-rows";
import type { BoardCardEdge } from "./drag-and-drop/use-board-card-drag-and-drop";
import type { BoardColumn, BoardDropResult } from "./model/board.types";

/** A card was dropped on another card, above or below it — the dropped-on
 * card's column and edge together determine the new status and sibling
 * position. */
export function resolveCardDrop(
	edge: BoardCardEdge,
	overCardId: string,
	columnStatusId: string | null,
	rootId: string | null,
): BoardDropResult {
	const target: MoveTarget = {
		position: edge === "top" ? "before" : "after",
		targetId: overCardId,
		parentId: rootId,
	};
	return { statusId: columnStatusId, target };
}

/** A card was dropped into a column's empty space rather than on a specific
 * card — it lands after that column's last card (or as the first child
 * overall, if the column has none). */
export function resolveColumnDrop(
	draggedId: string,
	columnStatusId: string | null,
	columns: BoardColumn[],
	rootId: string | null,
): BoardDropResult {
	const column = columns.find(
		(candidate) => (candidate.status?.id ?? null) === columnStatusId,
	);
	const siblings = column?.cards.filter((card) => card.id !== draggedId) ?? [];
	const last = siblings[siblings.length - 1];
	const target: MoveTarget = last
		? { position: "after", targetId: last.id, parentId: rootId }
		: { position: "append", parentId: rootId };
	return { statusId: columnStatusId, target };
}
