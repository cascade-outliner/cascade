import type { SerializedEditorState } from "lexical";

/**
 * One outline node as plain, structured-cloneable data. `parentId` and
 * `childIds` are both carried: `parentId` gives O(1) upward walks (cycle
 * checks), `childIds` carries sibling order. `OutlineStore` is the only writer
 * and keeps the two in agreement; there is no load-time repair pass.
 *
 * `parentId` is `null` only for the synthetic root node. Every other node,
 * including top-level ones, points at a real parent id.
 */
export interface Node {
	id: string;
	parentId: string | null;
	childIds: string[];
	content: SerializedEditorState;
	collapsed: boolean;
	/**
	 * Epoch ms, made monotonic by the store: every write gets a value strictly
	 * greater than the last, so it doubles as a per-node change token (the
	 * IndexedDB adapter rewrites a record only when this moves) and, later, as
	 * an ordering for sync conflict resolution.
	 */
	updatedAt: number;
}
