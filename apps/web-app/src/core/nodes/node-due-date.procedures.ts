import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { nodes } from "@/core/nodes/node.schema";
import { dueDateSchema } from "@/core/nodes/node-due-date-schema";
import { db } from "@/db";
import { authed } from "@/orpc/context";

export const setNodeDueDate = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string(), dueDate: dueDateSchema.nullable() }))
	.handler(async ({ input, context, errors }) => {
		const updated = await db
			.update(nodes)
			.set({ dueDate: input.dueDate })
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
			.returning({ id: nodes.id });
		if (updated.length === 0) throw errors.NOT_FOUND();
	});
