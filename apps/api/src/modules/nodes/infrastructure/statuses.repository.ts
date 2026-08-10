import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, eq } from "drizzle-orm";
import {
	DRIZZLE,
	type DrizzleClient,
} from "../../../database/drizzle.provider";
import { nodes, statuses } from "../../../database/schema/node-tables";

/** Ported from apps/web-app/src/features/nodes/server/procedures/list-statuses.ts. */
@Injectable()
export class StatusesRepository {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

	async listWithUsage(userId: string, boardId: string) {
		return this.db
			.select({
				id: statuses.id,
				name: statuses.name,
				color: statuses.color,
				hidden: statuses.hidden,
				count: count(nodes.id),
			})
			.from(statuses)
			.leftJoin(nodes, eq(nodes.statusId, statuses.id))
			.where(and(eq(statuses.userId, userId), eq(statuses.boardId, boardId)))
			.groupBy(statuses.id)
			.orderBy(asc(statuses.sortOrder), asc(statuses.name));
	}
}
