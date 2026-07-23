import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { updateNodeContentInputSchema } from "../../model/node-content.schema";
import { nodes } from "../persistence/node-tables";

export const updateNodeContent = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(updateNodeContentInputSchema)
	.handler(async ({ input, context, errors }) => {
		const [result] = await db
			.update(nodes)
			.set({ content: input.content })
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
			.returning({ id: nodes.id });
		if (!result) throw errors.NOT_FOUND();
	});
