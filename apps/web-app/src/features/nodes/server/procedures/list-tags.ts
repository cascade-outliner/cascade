import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { nodeTags, tags } from "../persistence/node-tables";

/** This user's tags with how many nodes each is on, sorted by name. */
export const listTags = authed.handler(async ({ context }) => {
	return db
		.select({ name: tags.name, count: count(nodeTags.nodeId) })
		.from(tags)
		.leftJoin(nodeTags, eq(nodeTags.tagId, tags.id))
		.where(eq(tags.userId, context.user.id))
		.groupBy(tags.id)
		.orderBy(asc(tags.name));
});
