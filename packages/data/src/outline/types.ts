import type { NodeSnapshot } from "../types.ts";

/**
 * The outline as plain, structured-cloneable data. This module owns every tree
 * rule - where an id belongs, whether a move forms a cycle, which nodes are in a
 * subtree, how corruption is repaired. `NodeStore` is the MobX adapter over it:
 * it calls `apply`, reflects the result onto observable models, and writes the
 * `writes` through to persistence.
 */
export interface Outline {
	readonly userId: string;
	readonly nodes: Map<string, NodeSnapshot>;
	readonly rootIds: readonly string[];
}

export interface OutlineChange {
	/** Snapshots to write through to persistence. Includes delete tombstones. */
	writes: NodeSnapshot[];
	/** Ids whose live snapshot changed or was created. */
	touched: string[];
	/** Ids removed from the live set (soft-deleted). */
	removed: string[];
	/** Replacement root order, or `null` when it did not change. */
	rootIds: string[] | null;
}
