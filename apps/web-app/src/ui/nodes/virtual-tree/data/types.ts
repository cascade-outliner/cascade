import type { VisibleNodeRow } from "@cascade/outliner/node-types";

export interface VisibleTreeData {
	rows: VisibleNodeRow[];
	nextCursor: string[] | null;
}
