import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db";
import { authed } from "../../../../orpc/context";
import { ancestorsOf } from "../persistence/tree-cte";

export const getNodeAncestors = authed
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const userId = context.user.id;
		const result = (await db.execute(sql`
			WITH RECURSIVE ${ancestorsOf(input.id, userId)}
			SELECT id, content FROM chain ORDER BY depth DESC
		`)) as unknown as { id: string; content: unknown }[];
		return result;
	});
