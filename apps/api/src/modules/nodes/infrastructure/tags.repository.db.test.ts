import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseModule } from "../../../database/database.module";
import {
	DRIZZLE,
	type DrizzleClient,
} from "../../../database/drizzle.provider";
import { nodes, tags } from "../../../database/schema/node-tables";
import { TagsRepository } from "./tags.repository";

describe("TagsRepository (Postgres integration)", () => {
	let db: DrizzleClient;
	let repository: TagsRepository;
	let userId: string;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [DatabaseModule],
			providers: [TagsRepository],
		}).compile();

		db = moduleRef.get(DRIZZLE);
		repository = moduleRef.get(TagsRepository);

		userId = randomUUID();
		await db.execute(sql`
			INSERT INTO "user" (id, name, email)
			VALUES (${userId}, 'db-test', ${`db-test-${userId}@example.test`})
		`);
	});

	afterEach(async () => {
		await db.delete(nodes).where(sql`user_id = ${userId}`);
		await db.delete(tags).where(sql`user_id = ${userId}`);
		await db.execute(sql`DELETE FROM "user" WHERE id = ${userId}`);
	});

	it("lists this user's tags alphabetically with usage counts, ignoring other users' tags", async () => {
		const other = randomUUID();
		await db.execute(sql`
			INSERT INTO "user" (id, name, email)
			VALUES (${other}, 'db-test-other', ${`db-test-other-${other}@example.test`})
		`);

		const [urgent] = await db
			.insert(tags)
			.values({ userId, name: "urgent" })
			.returning();
		await db.insert(tags).values({ userId, name: "later" }).returning();
		await db.insert(tags).values({ userId: other, name: "urgent" });

		const [node1] = await db
			.insert(nodes)
			.values({ userId, content: {}, order: "a0" })
			.returning();
		const [node2] = await db
			.insert(nodes)
			.values({ userId, content: {}, order: "a1" })
			.returning();
		await db.execute(
			sql`INSERT INTO node_tags (node_id, tag_id) VALUES (${node1.id}, ${urgent.id}), (${node2.id}, ${urgent.id})`,
		);

		const result = await repository.listWithUsage(userId);

		expect(result).toEqual([
			{ name: "later", count: 0 },
			{ name: "urgent", count: 2 },
		]);

		await db.execute(sql`DELETE FROM "user" WHERE id = ${other}`);
	});
});
