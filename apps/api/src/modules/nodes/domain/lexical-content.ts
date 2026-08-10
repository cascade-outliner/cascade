interface LexicalTextNode {
	type: "text";
	text: string;
}

interface LexicalElementNode {
	type: string;
	tag?: string;
	children?: LexicalNode[];
}

type LexicalNode = LexicalElementNode | LexicalTextNode;

function isLexicalElementNode(node: object): node is LexicalElementNode {
	const candidate = node as {
		type?: string;
		children?: LexicalNode[] | undefined;
	};
	if (typeof candidate.type !== "string") return false;
	return candidate.children === undefined || Array.isArray(candidate.children);
}

function isLexicalTextNode(node: LexicalNode): node is LexicalTextNode {
	return (
		node.type === "text" && "text" in node && typeof node.text === "string"
	);
}

/**
 * Ported from packages/outliner/src/editor/lexical/content/lexical-content.ts
 * (only the pieces this module's reads need) — single place where untyped
 * jsonb content is narrowed to Lexical shape.
 */
export function toLexicalContent<T>(
	content: T,
): { root: LexicalElementNode } | null {
	if (content === null || content === undefined || typeof content !== "object")
		return null;
	const candidate = content as { root?: object | null };
	if (!candidate.root || !isLexicalElementNode(candidate.root)) return null;
	return { root: candidate.root };
}

// Defense in depth against pathologically nested content (e.g. pre-existing
// rows written before size/depth limits were enforced on write).
const MAX_WALK_DEPTH = 64;

export function lexicalToPlainText<T>(content: T, limit = 200): string {
	const lexical = toLexicalContent(content);
	if (!lexical) return "";
	let out = "";
	const walk = (node: LexicalNode, depth: number): void => {
		if (out.length >= limit || depth > MAX_WALK_DEPTH) return;
		if (isLexicalTextNode(node)) {
			out += `${node.text} `;
			return;
		}
		for (const child of node.children ?? []) {
			if (out.length >= limit) return;
			walk(child, depth + 1);
		}
	};
	walk(lexical.root, 0);
	return out.slice(0, limit).replace(/\s+/g, " ").trim();
}
