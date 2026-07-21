import type { LexicalElementNode } from "./read/lexical-read-view";
import type { LexicalTextNode } from "./read/render-text-nodes";

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
 * Single place where untyped jsonb content is narrowed to Lexical shape,
 * replacing the ad-hoc `as { root: ... }` casts at every boundary.
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

/** The Lexical block type a node's content can be "turned into" (see `node-actions.tsx`'s "Turn into" menu). */
export type BlockType = "paragraph" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export const blockTypes: BlockType[] = [
	"paragraph",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
];

/**
 * The block type of a node's content, read from its first top-level child
 * (Cascade nodes hold a single block; the tree's own nesting handles
 * structure). Defaults to "paragraph" for empty/null/unrecognized content.
 */
export function getBlockType<T>(content: T): BlockType {
	const lexical = toLexicalContent(content);
	const first = lexical?.root.children?.[0];
	if (!first || isLexicalTextNode(first)) return "paragraph";
	if (first.type === "heading" && first.tag && blockTypes.includes(first.tag))
		return first.tag;
	return "paragraph";
}

/**
 * Converts every top-level paragraph/heading child of a node's content to
 * `blockType`, preserving their children (text, links, …) untouched. Pure
 * JSON transform — no live editor instance required, since `updateContent`
 * already accepts client-built content without one.
 */
export function setBlockType<T>(
	content: T,
	blockType: BlockType,
): { root: LexicalElementNode } {
	const lexical = toLexicalContent(content);
	if (!lexical) {
		return {
			root: {
				type: "root",
				children: [toBlock({ type: "paragraph", children: [] }, blockType)],
			},
		};
	}
	return {
		root: {
			...lexical.root,
			children: lexical.root.children?.map((child) =>
				child.type === "paragraph" || child.type === "heading"
					? toBlock(child as LexicalElementNode, blockType)
					: child,
			),
		},
	};
}

function toBlock(
	node: LexicalElementNode,
	blockType: BlockType,
): LexicalElementNode {
	if (blockType === "paragraph") {
		const { tag: _tag, ...rest } = node;
		return { ...rest, type: "paragraph" };
	}
	return { ...node, type: "heading", tag: blockType };
}
