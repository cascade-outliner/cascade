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
	/** Epoch ms. Bumped on every write. Reserved for future sync conflict resolution. */
	updatedAt: number;
}

/**
 * The seam `OutlineStore` persists through. Not implemented this round - the
 * default is a no-op and the store runs fully in memory. The IndexedDB adapter
 * is the next step; it slots in here without touching the store.
 */
export interface OutlinePersistence {
	load(): Promise<{ nodes: Node[] } | null>;
	save(snapshot: { nodes: Node[] }): Promise<void>;
}
