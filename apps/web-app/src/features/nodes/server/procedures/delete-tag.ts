import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { tags } from "../persistence/node-tables";

/** Deletes a tag outright, cascading to every node association. */
export const deleteTag = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Tag not found" },
	})
	.input(z.object({ name: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const deleted = await db
			.delete(tags)
			.where(and(eq(tags.userId, context.user.id), eq(tags.name, input.name)))
			.returning({ id: tags.id });
		if (deleted.length === 0) throw errors.NOT_FOUND();
	});
