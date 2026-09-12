import type { SerializedEditorState } from "lexical";

/**
 * A single node in the outline.
 */
export interface Node {
	/** Unique, stable identifier. */
	id: string;
	/** Identifier of the parent node, or `null` for a root node. */
	parentId: string | null;
	order: string;
	/** Rich text content, serialized from a Lexical editor state. */
	content: SerializedEditorState;
	/** Whether the node's children are hidden in the UI. */
	collapsed: boolean;
	/** Task state, or `undefined` if this node is plain text. */
	task?: { done: boolean };
	/**
	 * Timestamp of the last modification, in milliseconds since the epoch.
	 *
	 * Reserved for future sync conflict resolution.
	 */
	updatedAt: number;
}

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

/**
 * A node in the derived outline tree, as consumed by the UI.
 */
export interface OutlineNode {
	id: string;
	text: SerializedEditorState;
	children: OutlineNode[];
	collapsed?: boolean;
	task?: { done: boolean };
}
