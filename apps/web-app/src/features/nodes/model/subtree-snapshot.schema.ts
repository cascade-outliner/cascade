import { typedMetadataSchema } from "@cascade/outliner/node-types";
import { recurrenceRuleSchema } from "@cascade/outliner/recurrence";
import { z } from "zod";
import { dueDateSchema } from "./due-date.schema";
import { lexicalElementNodeSchema } from "./node-content.schema";

export const restoreTargetSchema = z.discriminatedUnion("position", [
	z.object({ position: z.literal("before"), targetId: z.string() }),
	z.object({ position: z.literal("after"), targetId: z.string() }),
	z.object({ position: z.literal("append") }),
]);

export type RestoreTarget = z.infer<typeof restoreTargetSchema>;

const nodeSnapshotSchema = z
	.object({
		id: z.string(),
		content: z.object({ root: lexicalElementNodeSchema }).nullable(),
		expanded: z.boolean(),
		dueDate: dueDateSchema.nullable(),
		recurrence: recurrenceRuleSchema.nullable().default(null),
		tags: z.array(z.string()),
	})
	.and(typedMetadataSchema)
	.superRefine((node, context) => {
		if (node.recurrence && (node.type !== "task" || !node.dueDate)) {
			context.addIssue({
				code: "custom",
				path: ["recurrence"],
				message: "Recurrence requires a task with a due date",
			});
		}
	});

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
