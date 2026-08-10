import { Inject, Injectable } from "@nestjs/common";
import { asc, count, eq } from "drizzle-orm";
import {
	DRIZZLE,
	type DrizzleClient,
} from "../../../database/drizzle.provider";
import { nodeTags, tags } from "../../../database/schema/node-tables";

/** Ported from apps/web-app/src/features/nodes/server/procedures/list-tags.ts. */
@Injectable()
export class TagsRepository {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

	async listWithUsage(userId: string) {
		return this.db
			.select({ name: tags.name, count: count(nodeTags.nodeId) })
			.from(tags)
			.leftJoin(nodeTags, eq(nodeTags.tagId, tags.id))
			.where(eq(tags.userId, userId))
			.groupBy(tags.id)
			.orderBy(asc(tags.name));
	}
}
