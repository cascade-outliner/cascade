import { z } from "zod";
import type { CalendarDateString } from "../../dates/calendar-date";
import type { CalendarTimeString } from "../../dates/calendar-time";
import type { RecurrenceRule } from "../../dates/recurrence";
import type { PriorityName } from "./node-priority";
import type { StatusSummary } from "./node-statuses";

/** A single node as the server sends it: unordered, with no tree structure computed. */
export interface FlatNodeRow {
	id: string;
	parentId: string | null;
	content: unknown;
	type: NodeTypeName;
	/** Per-type data; narrow via the `type` discriminant (see node-types.ts). */
	metadata: NodeMetadata;
	expanded: boolean;
	order: string;
	dueDate: CalendarDateString | null;
	/** Local wall-clock time paired with `dueDate`, or `null` for an all-day due date. */
	dueTime: CalendarTimeString | null;
	recurrence?: RecurrenceRule | null;
	/** Fixed priority level, or `null`/absent for no priority (see #576). */
	priority?: PriorityName | null;
	/** The user-defined status this node is in, denormalized by the server. */
	status?: StatusSummary | null;
	tags: string[];
	/** A single emoji, or `null` for no custom icon (see #557). */
	icon: string | null;
	/** A named palette color or custom hex string (`#rrggbb`), or `null` for no color (see #656). */
	color: string | null;
	/** Whether this node's own detail page renders its direct children as a
	 * status-grouped board instead of the tree, or `false`/absent for the
	 * default tree (see #455). */
	isBoard?: boolean;
}

/**
 * One row of the flattened, depth-first visible tree, built client-side from
 * `FlatNodeRow[]` by `buildVisibleTree` (grouping by `parentId`, sorting
 * siblings by `order`, and walking expanded nodes depth-first).
 */
export interface VisibleNodeRow extends FlatNodeRow {
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
		label: "Paragraph",
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
