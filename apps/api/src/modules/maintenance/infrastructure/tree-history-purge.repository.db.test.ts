import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseModule } from "../../../database/database.module";
import {
	DRIZZLE,
	type DrizzleClient,
} from "../../../database/drizzle.provider";
import { treeHistoryEvents } from "../../../database/schema/tree-history-table";
import { PurgeTreeHistoryService } from "../application/purge-tree-history.service";
import { TreeHistoryPurgeRepository } from "./tree-history-purge.repository";

describe("TreeHistoryPurgeRepository (Postgres integration)", () => {
	let db: DrizzleClient;
	let repository: TreeHistoryPurgeRepository;
	let service: PurgeTreeHistoryService;
	let userId: string;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [DatabaseModule],
			providers: [TreeHistoryPurgeRepository, PurgeTreeHistoryService],
		}).compile();

		db = moduleRef.get(DRIZZLE);
		repository = moduleRef.get(TreeHistoryPurgeRepository);
		service = moduleRef.get(PurgeTreeHistoryService);

		// Raw SQL rather than @cascade/auth/schema's `user` table: mixing that
		// table's type with apps/api's own DrizzleClient hits the same
		// ESM/CJS declaration mismatch documented in
		// database/schema/tree-history-table.ts.
		userId = randomUUID();
		await db.execute(sql`
			INSERT INTO "user" (id, name, email)
			VALUES (${userId}, 'db-test', ${`db-test-${userId}@example.test`})
		`);
	});

	afterEach(async () => {
		await db.execute(sql`DELETE FROM "user" WHERE id = ${userId}`);
	});

	async function insertEvent(createdAt: Date): Promise<string> {
		const [event] = await db
			.insert(treeHistoryEvents)
			.values({
				userId,
				kind: "node_created",
				nodeId: randomUUID(),
				payload: { label: "test" },
				createdAt,
			})
			.returning({ id: treeHistoryEvents.id });
		return event.id;
	}

	it("dry-run reports matching events without deleting them", async () => {
		const oldEventId = await insertEvent(new Date("2020-01-01T00:00:00.000Z"));

		const result = await service.purge(0, true);

		expect(result.purgedIds).toContain(oldEventId);
		expect(
			await db
				.select()
				.from(treeHistoryEvents)
				.where(eq(treeHistoryEvents.id, oldEventId)),
		).toHaveLength(1);
	});

	it("purges events older than the retention window and leaves newer ones", async () => {
		const oldEventId = await insertEvent(new Date("2020-01-01T00:00:00.000Z"));
		const recentEventId = await insertEvent(new Date());

		const result = await service.purge(30);

		expect(result.purgedIds).toContain(oldEventId);
		expect(result.purgedIds).not.toContain(recentEventId);
		expect(
			await db
				.select()
				.from(treeHistoryEvents)
				.where(eq(treeHistoryEvents.id, oldEventId)),
		).toHaveLength(0);
		expect(
			await db
				.select()
				.from(treeHistoryEvents)
				.where(eq(treeHistoryEvents.id, recentEventId)),
		).toHaveLength(1);
	});

	it("--days=0 purges all of a user's existing history", async () => {
		const eventId = await insertEvent(new Date());

		const result = await service.purge(0);

		expect(result.purgedIds).toContain(eventId);
		expect(
			await db
				.select()
				.from(treeHistoryEvents)
				.where(eq(treeHistoryEvents.userId, userId)),
		).toHaveLength(0);
	});

	it("findEventIdsOlderThan/deleteEventsOlderThan operate directly against Postgres", async () => {
		const oldEventId = await insertEvent(new Date("2020-01-01T00:00:00.000Z"));
		const cutoff = new Date();

		expect(await repository.findEventIdsOlderThan(cutoff)).toContain(
			oldEventId,
		);
		expect(await repository.deleteEventsOlderThan(cutoff)).toContain(
			oldEventId,
		);
		expect(
			await db
				.select()
				.from(treeHistoryEvents)
				.where(eq(treeHistoryEvents.id, oldEventId)),
		).toHaveLength(0);
	});
});
