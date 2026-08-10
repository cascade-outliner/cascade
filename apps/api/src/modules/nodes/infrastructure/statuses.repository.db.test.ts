import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseModule } from "../../../database/database.module";
import {
	DRIZZLE,
	type DrizzleClient,
} from "../../../database/drizzle.provider";
import { nodes, statuses } from "../../../database/schema/node-tables";
import { StatusesRepository } from "./statuses.repository";

describe("StatusesRepository (Postgres integration)", () => {
	let db: DrizzleClient;
	let repository: StatusesRepository;
	let userId: string;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [DatabaseModule],
			providers: [StatusesRepository],
		}).compile();

		db = moduleRef.get(DRIZZLE);
		repository = moduleRef.get(StatusesRepository);

		userId = randomUUID();
		await db.execute(sql`
			INSERT INTO "user" (id, name, email)
			VALUES (${userId}, 'db-test', ${`db-test-${userId}@example.test`})
		`);
	});

	afterEach(async () => {
		await db.delete(nodes).where(sql`user_id = ${userId}`);
		await db.delete(statuses).where(sql`user_id = ${userId}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${userId}`);
	});

	it("lists a board's statuses in sort order, scoped by user and boardId, with usage counts", async () => {
		const [board] = await db
			.insert(nodes)
			.values({ userId, content: {}, order: "a0", isBoard: true })
			.returning();
		const [otherBoard] = await db
			.insert(nodes)
			.values({ userId, content: {}, order: "a1", isBoard: true })
			.returning();

		const [doing] = await db
			.insert(statuses)
			.values({ userId, boardId: board.id, name: "Doing", sortOrder: 1 })
			.returning();
		await db
			.insert(statuses)
			.values({ userId, boardId: board.id, name: "Todo", sortOrder: 0 });
		await db
			.insert(statuses)
			.values({ userId, boardId: otherBoard.id, name: "Unrelated" });

		await db
			.insert(nodes)
			.values({ userId, content: {}, order: "a2", statusId: doing.id });

		const result = await repository.listWithUsage(userId, board.id);

		expect(result.map((s) => s.name)).toEqual(["Todo", "Doing"]);
		expect(result.find((s) => s.name === "Doing")).toMatchObject({
			count: 1,
			hidden: false,
		});
	});
});
