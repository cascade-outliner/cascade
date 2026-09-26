import type { Node } from "../outline/types.ts";

/**
 * Persistence boundary for the outline.
 */
export interface OutlinePersistence {
	/**
	 * Return all stored nodes.
	 *
	 * Called once when the store is initialized.
	 */
	load(): Promise<Node[]>;
	/**
	 * Apply a set of changes atomically.
	 *
	 * Nodes in `put` are inserted or replaced by `id`; identifiers in `delete`
	 * are removed. The returned promise resolves once all changes are durable.
	 */
	write(change: OutlineChange): Promise<void>;
	/**
	 * Call `listener` with every change written by another instance, e.g. in
	 * another tab. Returns an unsubscribe function. Optional: persistence that
	 * can't be shared needn't implement it.
	 */
	subscribe?(listener: (change: OutlineChange) => void): () => void;
}

/** Nodes to insert or replace by `id`, and identifiers to remove. */
export interface OutlineChange {
	put: Node[];
	delete: string[];
}
