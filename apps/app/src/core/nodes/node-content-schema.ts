import { MAX_URL_LENGTH } from "@cascade/outliner/lexical/link-url";
import { z } from "zod";

// Lexical content is ~3-4 levels deep in practice; these caps are generous
// margins that still stop pathological (deeply nested / oversized) payloads.
export const MAX_LEXICAL_DEPTH = 8;
export const MAX_CHILDREN_PER_NODE = 500;
export const MAX_TEXT_LENGTH = 20_000;
export const MAX_CONTENT_BYTES = 256 * 1024;

// Explicit allowlist of the fields the registered Lexical nodes (root,
// paragraph, text, tab, linebreak, @lexical/link's LinkNode / AutoLinkNode,
// and @lexical/rich-text's HeadingNode) actually serialize, instead of
// `.passthrough()`.
export interface LexicalSchemaNode {
	type: string;
	text?: string;
	format?: number | string;
	detail?: number;
	mode?: string;
	style?: string;
	indent?: number;
	direction?: "ltr" | "rtl" | null;
	version?: number;
	textFormat?: number;
	textStyle?: string;
	url?: string;
	rel?: string | null;
	target?: string | null;
	title?: string | null;
	isUnlinked?: boolean;
	// @lexical/rich-text's HeadingNode.
	tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
	children?: LexicalSchemaNode[];
}

function lexicalNodeSchema(depth: number): z.ZodType<LexicalSchemaNode> {
	return z
		.object({
			type: z.string(),
			text: z.string().max(MAX_TEXT_LENGTH).optional(),
			format: z.union([z.number(), z.string()]).optional(),
			detail: z.number().optional(),
			mode: z.string().optional(),
			style: z.string().optional(),
			indent: z.number().optional(),
			direction: z.enum(["ltr", "rtl"]).nullable().optional(),
			version: z.number().optional(),
			// Lexical's ElementNode (root, paragraph, ...) always serializes
			// these two alongside `format`/`children`.
			textFormat: z.number().optional(),
			textStyle: z.string().optional(),
			// @lexical/link's LinkNode. Only http(s) URLs are accepted, so a
			// stored `javascript:`/`data:` URL can never reach an href.
			url: z
				.string()
				.max(MAX_URL_LENGTH)
				.regex(/^https?:\/\//i)
				.optional(),
			rel: z.string().max(256).nullable().optional(),
			target: z.string().max(64).nullable().optional(),
			title: z.string().max(512).nullable().optional(),
			// AutoLinkNode also serializes this alongside the LinkNode fields.
			isUnlinked: z.boolean().optional(),
			tag: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).optional(),
			children:
				depth >= MAX_LEXICAL_DEPTH
					? z.array(z.never()).max(0).optional()
					: z
							.array(z.lazy(() => lexicalNodeSchema(depth + 1)))
							.max(MAX_CHILDREN_PER_NODE)
							.optional(),
		})
		.strict();
}

export const lexicalElementNodeSchema = lexicalNodeSchema(0);
export type LexicalElementNodeFromSchema = z.infer<
	typeof lexicalElementNodeSchema
>;
export type LexicalContentFromSchema = {
	root: LexicalElementNodeFromSchema;
};

export const updateNodeContentInputSchema = z
	.object({
		id: z.string(),
		content: z.object({ root: lexicalElementNodeSchema }),
	})
	.refine(
		(input) =>
			Buffer.byteLength(JSON.stringify(input.content)) <= MAX_CONTENT_BYTES,
		{ message: "content exceeds maximum size", path: ["content"] },
	);
