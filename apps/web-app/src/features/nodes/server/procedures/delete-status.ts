import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { statuses } from "../persistence/node-tables";

/** Deletes a status outright. Nodes in it aren't deleted — the `set null` FK
 * just clears their `status_id` (see #576). */
export const deleteStatus = authed
	.errors({
		NOT_FOUND: { status: 404, message: "Status not found" },
	})
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context, errors }) => {
		const deleted = await db
			.delete(statuses)
			.where(
				and(eq(statuses.id, input.id), eq(statuses.userId, context.user.id)),
			)
			.returning({ id: statuses.id });
		if (deleted.length === 0) throw errors.NOT_FOUND();
	});
