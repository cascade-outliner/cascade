import type { SerializedEditorState, SerializedLexicalNode } from "lexical";

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

/**
 * Flattens a node's rich content to plain text, for places that can't render a
 * Lexical editor (e.g. the zoom breadcrumb). Line breaks come out as "\n".
 */
export function plainText(content: SerializedEditorState): string {
	const walk = (node: SerializedLexicalNode): string => {
		const { text, children } = node as SerializedLexicalNode & {
			text?: string;
			children?: SerializedLexicalNode[];
		};
		if (node.type === "linebreak") {
			return "\n";
		}
		if (typeof text === "string") {
			return text;
		}
		return (children ?? []).map(walk).join("");
	};
	return walk(content.root as unknown as SerializedLexicalNode);
}

function textNode(text: string): SerializedLexicalNode {
	return {
		detail: 0,
		format: 0,
		mode: "normal",
		style: "",
		text,
		type: "text",
		version: 1,
	} as SerializedLexicalNode;
}

/** The serialized Lexical state of a node holding `text` as one paragraph; "\n" becomes a line break. */
export function textState(text: string): SerializedEditorState {
	const children = text
		.split("\n")
		.flatMap((line, index) =>
			index === 0
				? [textNode(line)]
				: [{ type: "linebreak", version: 1 }, textNode(line)],
		);
	return {
		root: {
			children: [
				{
					children,
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
