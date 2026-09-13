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
	write(change: { put: Node[]; delete: string[] }): Promise<void>;
}
