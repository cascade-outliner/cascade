import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseModule } from "./database.module";
import { DRIZZLE } from "./drizzle.provider";

describe("DatabaseModule", () => {
	const originalDatabaseUrl = process.env.DATABASE_URL;

	beforeEach(() => {
		process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/test";
	});

	afterEach(() => {
		process.env.DATABASE_URL = originalDatabaseUrl;
	});

	it("resolves a Drizzle client from the DRIZZLE token", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [DatabaseModule],
		}).compile();

		const db = moduleRef.get(DRIZZLE);

		expect(db).toBeDefined();

		await moduleRef.close();
	});

	it("throws when DATABASE_URL is missing", async () => {
		delete process.env.DATABASE_URL;

		await expect(
			Test.createTestingModule({
				imports: [DatabaseModule],
			}).compile(),
		).rejects.toThrow("DATABASE_URL environment variable is required");
	});
});
