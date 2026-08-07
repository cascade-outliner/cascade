import type { StatusOption } from "../../nodes/model/node-statuses";
import type { VisibleNodeRow } from "../../nodes/model/node-types";
import type { MoveTarget } from "../../tree/rows/visible-rows";

/**
 * One board column. `status` is `null` for the "unassigned" column that
 * holds cards without a status, always rendered first regardless of the
 * user's status sort order. A hidden status still gets its own column
 * (rendered dimmed by `BoardColumn`, see `status.hidden`) rather than being
 * dropped, so cards already carrying it stay visible in place.
 */
export interface BoardColumn {
	status: StatusOption | null;
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
