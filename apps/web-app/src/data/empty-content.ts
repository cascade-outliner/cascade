import type { SerializedEditorState } from "lexical";

/** The serialized Lexical state of a brand new, empty node. */
export function emptyState(): SerializedEditorState {
	return {
		root: {
			children: [
				{
					children: [],
					direction: null,
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: null,
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	} as unknown as SerializedEditorState;
}
