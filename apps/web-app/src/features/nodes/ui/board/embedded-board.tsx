import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { NodeBoard } from "#/features/nodes/ui/detail/node-board";

/** `VirtualTreeProps.renderBoard`: a board-converted row's direct children
 * never flatten into further tree rows (see `walkVisibleTree`), so any
 * outline — the root outline or a node's own subtree — renders them as this
 * embedded board in place instead, without navigating to the node's own
 * detail page. */
export function renderEmbeddedBoard(row: Pick<VisibleNodeRow, "id">) {
	return <NodeBoard nodeId={row.id} className="h-auto max-h-[32rem]" />;
}
