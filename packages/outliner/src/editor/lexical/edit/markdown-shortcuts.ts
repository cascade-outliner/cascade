import {
	BOLD_STAR,
	BOLD_UNDERSCORE,
	HEADING,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
	type Transformer,
} from "@lexical/markdown";

/**
 * Curated subset of `@lexical/markdown`'s `TRANSFORMERS`: only the shortcuts
 * whose target nodes are registered on the node editor (`HeadingNode`) or
 * need no node at all (text-format transformers toggle format bits already
 * rendered by `render-text-node.tsx`). Excludes list/quote/code/link/table
 * transformers, which would need node types this editor doesn't register.
 *
 * Order matters: longer tags (`**`, `__`) must be tried before the shorter
 * `*`/`_` they'd otherwise shadow, mirroring `TEXT_FORMAT_TRANSFORMERS`.
 */
export const MARKDOWN_SHORTCUT_TRANSFORMERS: Transformer[] = [
	HEADING,
	BOLD_STAR,
	BOLD_UNDERSCORE,
	ITALIC_STAR,
	ITALIC_UNDERSCORE,
];
