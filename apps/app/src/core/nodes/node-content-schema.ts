import { z } from "zod";

// Lexical content is ~3-4 levels deep in practice; these caps are generous
// margins that still stop pathological (deeply nested / oversized) payloads.
export const MAX_LEXICAL_DEPTH = 8;
export const MAX_CHILDREN_PER_NODE = 500;
export const MAX_TEXT_LENGTH = 20_000;
export const MAX_CONTENT_BYTES = 256 * 1024;
export const MAX_URL_LENGTH = 2048;

// Explicit allowlist of the fields Lexical's built-in nodes (root, paragraph,
// text, tab, linebreak, link) actually serialize, instead of `.passthrough()`.
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
	// LinkNode fields (@lexical/link); absent on every other node type.
	url?: string;
	rel?: string | null;
	target?: string | null;
	title?: string | null;
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
			url: z.string().max(MAX_URL_LENGTH).optional(),
			rel: z.string().nullable().optional(),
			target: z.string().nullable().optional(),
			title: z.string().nullable().optional(),
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
