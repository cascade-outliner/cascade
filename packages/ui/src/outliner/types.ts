import type { SerializedEditorState } from "lexical";

export interface OutlineNode {
	id: string;
	text: SerializedEditorState;
	children: OutlineNode[];
	collapsed?: boolean;
}
