import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import { nodeColumns } from "../persistence/node-columns";
import { nodes } from "../persistence/node-tables";

export const getNode = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const [node] = await db
			.select(nodeColumns(context.user.id))
			.from(nodes)
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
			.limit(1);
		if (!node) throw errors.NOT_FOUND();
		return node;
	});
