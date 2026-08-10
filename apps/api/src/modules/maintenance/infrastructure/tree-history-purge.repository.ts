import { Inject, Injectable } from "@nestjs/common";
import { lt } from "drizzle-orm";
import {
	DRIZZLE,
	type DrizzleClient,
} from "../../../database/drizzle.provider";
import { treeHistoryEvents } from "../../../database/schema/tree-history-table";

@Injectable()
export class TreeHistoryPurgeRepository {
	constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

	async findEventIdsOlderThan(before: Date): Promise<string[]> {
		const rows = await this.db
			.select({ id: treeHistoryEvents.id })
			.from(treeHistoryEvents)
			.where(lt(treeHistoryEvents.createdAt, before));
		return rows.map((row) => row.id);
	}

	async deleteEventsOlderThan(before: Date): Promise<string[]> {
		const rows = await this.db
			.delete(treeHistoryEvents)
			.where(lt(treeHistoryEvents.createdAt, before))
			.returning({ id: treeHistoryEvents.id });
		return rows.map((row) => row.id);
	}
}
