import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { descendantsOf } from "../persistence/tree-cte";

export const deleteNode = authed
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const userId = context.user.id;
		const [result] = (await db.execute(sql`
			WITH RECURSIVE ${descendantsOf(input.id, userId)}
			DELETE FROM nodes WHERE id = ${input.id} AND user_id = ${userId}
			RETURNING (SELECT count(*) FROM descendants)::int AS count
		`)) as unknown as { count: number }[];

		return { childrenDeleted: result?.count ?? 0 };
	});
