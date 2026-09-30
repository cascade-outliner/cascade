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
	/** Due date as a local calendar day, `YYYY-MM-DD`, or `undefined` if none. */
	due?: string;
	/** An AI summary of the node's branch, pinned under its title when zoomed in. */
	summary?: Summary;
	/**
	 * Timestamp of the last modification, in milliseconds since the epoch.
	 *
	 * The newer write wins when another tab changes the same node.
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

/**
 * An AI summary of a branch. Each sentence cites the child branches it came
 * from, as 1-based indexes into `sources`.
 */
export interface Summary {
	sentences: { text: string; sources: number[] }[];
	/** Ids of the cited children, in the order they're first cited. */
	sources: string[];
	/** Fingerprint of the branch when summarized; the summary is stale once it changes. */
	basis: string;
	createdAt: number;
}
