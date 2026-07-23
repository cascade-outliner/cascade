import { typedMetadataSchema } from "@cascade/outliner/node-types";
import { z } from "zod";
import { dueDateSchema } from "./due-date.schema";
import { lexicalElementNodeSchema } from "./node-content.schema";

export const restoreTargetSchema = z.discriminatedUnion("position", [
	z.object({ position: z.literal("before"), targetId: z.string() }),
	z.object({ position: z.literal("after"), targetId: z.string() }),
	z.object({ position: z.literal("append") }),
]);

const nodeSnapshotSchema = z
	.object({
		id: z.string(),
		content: z.object({ root: lexicalElementNodeSchema }).nullable(),
		expanded: z.boolean(),
		dueDate: dueDateSchema.nullable(),
		tags: z.array(z.string()),
	})
	.and(typedMetadataSchema);

const descendantSnapshotSchema = nodeSnapshotSchema.and(
	z.object({ parentId: z.string(), order: z.string() }),
);

export const restoreNodeInputSchema = z.object({
	parentId: z.string().nullable(),
	target: restoreTargetSchema,
	root: nodeSnapshotSchema,
	descendants: z.array(descendantSnapshotSchema),
});

export type RestoreNodeInput = z.infer<typeof restoreNodeInputSchema>;
