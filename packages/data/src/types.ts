import type { SerializedEditorState } from "lexical";

export type ModelName = "node";

export interface NodeData {
	id: string;
	parentId: string | null;
	sortOrder: number;
	content: SerializedEditorState;
	collapsed: boolean;
	updatedAt: number;
}

export type NodePatch = Partial<Omit<NodeData, "id">>;
