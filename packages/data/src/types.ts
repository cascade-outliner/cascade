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
 * The whole outline in one value. Adapters treat it as opaque: they store and
 * return it, they do not interpret it. Always plain data - MobX proxies are not
 * structured-cloneable, so `OutlineStore` copies out before handing it over.
 */
export interface OutlineSnapshot {
	nodes: Node[];
}

/**
 * The seam `OutlineStore` persists through. Implementations live in
 * `./persistence.ts` and are injected at construction, so swapping IndexedDB
 * for a server-backed adapter is a change at the composition root and nowhere
 * else.
 *
 * `load` returning `null` means "nothing stored yet", which is not an error.
 * Both methods may reject; the store treats a failed read as "no data" and a
 * failed write as dropped, because neither is worth losing the session over.
 */
export interface OutlinePersistence {
	load(): Promise<OutlineSnapshot | null>;
	save(snapshot: OutlineSnapshot): Promise<void>;
}
