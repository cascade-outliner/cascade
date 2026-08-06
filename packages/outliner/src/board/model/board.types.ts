import type { StatusSummary } from "../../nodes/model/node-statuses";
import type { VisibleNodeRow } from "../../nodes/model/node-types";
import type { MoveTarget } from "../../tree/rows/visible-rows";

/**
 * One board column. `status` is `null` for the "unassigned" column that
 * holds cards without a status, always rendered first regardless of the
 * user's status sort order.
 */
export interface BoardColumn {
	status: StatusSummary | null;
	cards: VisibleNodeRow[];
}

/**
 * What a card drop resolves to: the status the card should carry after the
 * drop (the column it landed in) and where among its new siblings it should
 * land, expressed the same way `VisibleTree.move` already does.
 */
export interface BoardDropResult {
	statusId: string | null;
	target: MoveTarget;
}
