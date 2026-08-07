import type { HeadingTag } from "./heading-styles";

export interface LexicalTextNode {
	type: "text";
	text: string;
	format?: number;
}

export interface LexicalElementNode {
	type: string;
	tag?: HeadingTag;
	/** Cell text, present only on `type: "table"` nodes (see `editor/lexical/table`). */
	rows?: string[][];
	children?: (LexicalTextNode | LexicalElementNode)[];
}
