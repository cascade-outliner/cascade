import type { StatusWithUsage } from "@cascade/outliner/node-statuses";
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { listStatusesInputSchema } from "@/features/nodes/model/status.schema";
import { authed } from "@/orpc/context";
import { nodes, statuses } from "../persistence/node-tables";

/** This board's statuses in their display order (creation order by default),
 * each with how many nodes are in it so the settings panel can say what a
 * delete would clear, and whether it's hidden from the board/picker. */
export const listStatuses = authed.input(listStatusesInputSchema).handler(
	async ({ input, context }): Promise<StatusWithUsage[]> =>
		db
			.select({
				id: statuses.id,
				name: statuses.name,
				color: statuses.color,
				hidden: statuses.hidden,
				count: count(nodes.id),
			})
			.from(statuses)
			.leftJoin(nodes, eq(nodes.statusId, statuses.id))
			.where(
				and(
					eq(statuses.userId, context.user.id),
					eq(statuses.boardId, input.boardId),
				),
			)
			.groupBy(statuses.id)
			.orderBy(asc(statuses.sortOrder), asc(statuses.name)),
);
