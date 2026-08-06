import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { nodes } from "../persistence/node-tables";

/** Converts a node's own detail page between the tree and the board (#455)
 * — an explicit per-node choice, not a session view preference, so it's
 * scoped by user and persisted on the node itself like `expanded`. */
export const setNodeBoardView = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string(), isBoard: z.boolean() }))
	.handler(async ({ input, context, errors }) => {
		const updated = await db
			.update(nodes)
			.set({ isBoard: input.isBoard })
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
			.returning({ id: nodes.id });
		if (updated.length === 0) throw errors.NOT_FOUND();
	});
