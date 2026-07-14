import { z } from "zod";

/** One row of the flattened, depth-first visible tree (see nodes.visibleTree). */
export interface VisibleNodeRow {
	id: string;
	parentId: string | null;
	content: unknown;
	type: NodeTypeName;
	/** Per-type data; narrow via the `type` discriminant (see node-types.ts). */
	metadata: NodeMetadata;
	expanded: boolean;
	order: string;
	dueDate: Date | null;
	depth: number;
	/** Fractional-index orders from the query root down to this node; DFS sort key. */
	path: string[];
	hasChildren: boolean;
	isLastChild: boolean;
}

/**
 * Single source of truth for node types. Adding a type = one entry here plus
 * one member in `typedMetadataSchema` and a render branch in the tree row.
 */
export const nodeTypeDefs = {
	text: {
		label: "Text",
		metadataSchema: z.null(),
		defaultMetadata: null,
	},
	task: {
		label: "Task",
		metadataSchema: z.object({ completed: z.boolean() }),
		defaultMetadata: { completed: false },
	},
} as const satisfies Record<
	string,
	{ label: string; metadataSchema: z.ZodType; defaultMetadata: unknown }
>;

export type NodeTypeName = keyof typeof nodeTypeDefs;

export type NodeMetadataOf<T extends NodeTypeName> = z.infer<
	(typeof nodeTypeDefs)[T]["metadataSchema"]
>;

export const nodeTypeNames = Object.keys(nodeTypeDefs) as NodeTypeName[];

export const typedMetadataSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("text"), metadata: z.null() }),
	z.object({
		type: z.literal("task"),
		metadata: nodeTypeDefs.task.metadataSchema,
	}),
]);

export type TypedMetadata = z.infer<typeof typedMetadataSchema>;

/** Union of every type's `metadata` shape, e.g. for the `nodes.metadata` column. */
export type NodeMetadata = TypedMetadata["metadata"];

/** Builds a `{ type, metadata }` pair from a type's registered default metadata. */
export function defaultTypedMetadata<T extends NodeTypeName>(
	type: T,
): Extract<TypedMetadata, { type: T }> {
	return { type, metadata: nodeTypeDefs[type].defaultMetadata } as Extract<
		TypedMetadata,
		{ type: T }
	>;
}
