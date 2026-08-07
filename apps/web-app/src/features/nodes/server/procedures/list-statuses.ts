import type { StatusWithUsage } from "@cascade/outliner/node-statuses";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { nodes, statuses } from "../persistence/node-tables";

/** This user's statuses in their display order (creation order by default),
 * each with how many nodes are in it so the settings panel can say what a
 * delete would clear. */
export const listStatuses = authed.handler(
	async ({ context }): Promise<StatusWithUsage[]> =>
		db
			.select({
				id: statuses.id,
				name: statuses.name,
				color: statuses.color,
				count: count(nodes.id),
			})
			.from(statuses)
			.leftJoin(nodes, eq(nodes.statusId, statuses.id))
			.where(eq(statuses.userId, context.user.id))
			.groupBy(statuses.id)
			.orderBy(asc(statuses.sortOrder), asc(statuses.name)),
);
