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

/** Every node in the outline, the synthetic root included. */
export interface OutlineSnapshot {
	nodes: Node[];
}

/**
 * The seam `OutlineStore` persists through. `IndexedDbPersistence` is the
 * browser implementation; the default is a no-op and the store runs fully in
 * memory.
 *
 * `save` resolves once the snapshot - or a newer one that replaced it - has
 * landed, so an adapter is free to coalesce calls. `flush` waits for whatever
 * saves are still outstanding, for callers that need to know when storage has
 * caught up; adapters that write synchronously don't need it.
 */
export interface OutlinePersistence {
	load(): Promise<OutlineSnapshot | null>;
	save(snapshot: OutlineSnapshot): Promise<void>;
	flush?(): Promise<void>;
}
