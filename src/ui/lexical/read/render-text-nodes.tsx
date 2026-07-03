import type { ReactNode } from "react";

const BOLD = 1;
const ITALIC = 2;
const STRIKETHROUGH = 4;
const UNDERLINE = 8;

export interface LexicalTextNode {
	type: "text";
	text: string;
	format?: number;
}

export function renderTextNode(node: LexicalTextNode, key: number) {
	const fmt = node.format ?? 0;
	let el: ReactNode = node.text;

	if (fmt & UNDERLINE) el = <u key={key}>{el}</u>;
	if (fmt & STRIKETHROUGH) el = <s key={key}>{el}</s>;
	if (fmt & ITALIC) el = <em key={key}>{el}</em>;
	if (fmt & BOLD) el = <strong key={key}>{el}</strong>;
	return fmt ? el : <span key={key}>{node.text}</span>;
}
