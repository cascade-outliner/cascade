import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { nodes } from "../persistence/node-tables";

export const toggleNodeExpanded = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Node not found" },
	})
	.input(z.object({ id: z.string(), expanded: z.boolean() }))
	.handler(async ({ input, context, errors }) => {
		const updated = await db
			.update(nodes)
			.set({ expanded: input.expanded })
			.where(and(eq(nodes.id, input.id), eq(nodes.userId, context.user.id)))
			.returning({ id: nodes.id });
		if (updated.length === 0) throw errors.NOT_FOUND();
	});
