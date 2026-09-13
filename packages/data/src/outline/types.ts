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
 * One visible line of the outline: a node at its indentation depth.
 */
export interface Row {
	node: Node;
	/** Nesting depth below the row's root, starting at 0. */
	depth: number;
	/** Number of direct children, whether or not they are visible. */
	childCount: number;
}
