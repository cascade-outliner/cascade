import type { SerializedEditorState } from "lexical";

/**
 * The plain, structured-cloneable shape of a node as it lives in IndexedDB.
 *
 * `parentId` and `childIds` are redundant by design: `parentId` gives O(1)
 * upward walks, `childIds` carries sibling order. `NodeStore.hydrate` treats
 * `childIds` as authoritative and repairs disagreement between the two.
 */
export interface NodeSnapshot {
	id: string;
	userId: string;
	parentId: string | null;
	childIds: string[];
	content: SerializedEditorState | null;
	expanded: boolean;
	/** Epoch milliseconds. */
	createdAt: number;
	/** Epoch milliseconds. Future sync uses this to resolve conflicts. */
	updatedAt: number;
	/** Epoch milliseconds. A tombstone, so future sync can replicate deletes. */
	deletedAt: number | null;
}

/** Root nodes have no parent to hold their order, so it lives in its own record. */
export interface RootOrder {
	userId: string;
	ids: string[];
}

/**
 * Every write to the store is described by one of these and funnelled through
 * `NodeStore.applyMutation`. Nothing serializes them yet - they exist so that
 * appending to a sync outbox later is one line in that funnel rather than a
 * rewrite of every action. `at` is carried rather than read from the clock
 * inside the reducer, so a mutation stays replayable. See `./README.md`.
 */
export type Mutation = { at: number } & (
	| {
			type: "node.create";
			id: string;
			parentId: string | null;
			content: SerializedEditorState;
	  }
	| {
			type: "node.update";
			id: string;
			patch: Partial<Pick<NodeSnapshot, "content" | "expanded">>;
	  }
	| { type: "node.move"; id: string; parentId: string | null }
	| { type: "node.delete"; id: string }
);
