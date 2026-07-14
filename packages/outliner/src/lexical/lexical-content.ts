import type { LexicalElementNode } from "./read/lexical-read-view";
import type { LexicalTextNode } from "./read/render-text-nodes";

/**
 * Single place where untyped jsonb content is narrowed to Lexical shape,
 * replacing the ad-hoc `as { root: ... }` casts at every boundary.
 */
export function toLexicalContent(
	content: unknown,
): { root: LexicalElementNode } | null {
	if (
		content !== null &&
		typeof content === "object" &&
		"root" in content &&
		content.root !== null &&
		typeof content.root === "object"
	) {
		return content as { root: LexicalElementNode };
	}
	return null;
}

// Defense in depth against pathologically nested content (e.g. pre-existing
// rows written before size/depth limits were enforced on write).
const MAX_WALK_DEPTH = 64;

export function lexicalToPlainText(content: unknown, limit = 200): string {
	const lexical = toLexicalContent(content);
	if (!lexical) return "";
	let out = "";
	const walk = (
		node: LexicalElementNode | LexicalTextNode,
		depth: number,
	): void => {
		if (out.length >= limit || depth > MAX_WALK_DEPTH) return;
		if (node.type === "text") {
			out += `${(node as LexicalTextNode).text} `;
			return;
		}
		for (const child of (node as LexicalElementNode).children ?? []) {
			if (out.length >= limit) return;
			walk(child, depth + 1);
		}
	};
	walk(lexical.root, 0);
	return out.slice(0, limit).replace(/\s+/g, " ").trim();
}
