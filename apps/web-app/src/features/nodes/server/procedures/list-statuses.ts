import type { StatusSummary } from "@cascade/outliner/node-statuses";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { authed } from "@/orpc/context";
import { statuses } from "../persistence/node-tables";

/** This user's statuses in their display order (creation order by default). */
export const listStatuses = authed.handler(
	async ({ context }): Promise<StatusSummary[]> =>
		db
			.select({
				id: statuses.id,
				name: statuses.name,
				color: statuses.color,
			})
			.from(statuses)
			.where(eq(statuses.userId, context.user.id))
			.orderBy(asc(statuses.sortOrder), asc(statuses.name)),
);
