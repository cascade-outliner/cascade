import type { SerializedEditorState } from "lexical";

export interface Node {
	id: string;
	parentId: string | null;
	childIds: string[];
	content: SerializedEditorState;
	collapsed: boolean;
	/** TODO: Epoch ms. Bumped on every write. Reserved for future sync conflict resolution. */
	updatedAt: number;
}

export interface OutlineSnapshot {
	nodes: Node[];
}

export interface OutlinePersistence {
	load(): Promise<OutlineSnapshot | null>;
	save(snapshot: OutlineSnapshot): Promise<void>;
	flush?(): Promise<void>;
}
