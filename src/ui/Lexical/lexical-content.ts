import type { LexicalElementNode } from "#/ui/lexical/read/lexical-read-view";

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
