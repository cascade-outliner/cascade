import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AUTH, authProvider } from "./auth.provider";

@Module({
	providers: [authProvider],
	exports: [authProvider],
})
class TestAuthModule {}

describe("authProvider", () => {
	const originalDatabaseUrl = process.env.DATABASE_URL;
	const originalSecret = process.env.BETTER_AUTH_SECRET;
	const originalUrl = process.env.BETTER_AUTH_URL;

	beforeEach(() => {
		process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/test";
		process.env.BETTER_AUTH_SECRET = "a".repeat(32);
		process.env.BETTER_AUTH_URL = "http://localhost:3002";
	});

	afterEach(() => {
		process.env.DATABASE_URL = originalDatabaseUrl;
		process.env.BETTER_AUTH_SECRET = originalSecret;
		process.env.BETTER_AUTH_URL = originalUrl;
	});

	it("resolves a better-auth instance from the AUTH token", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [TestAuthModule],
		}).compile();

		const auth = moduleRef.get(AUTH);

		expect(auth).toBeDefined();
		expect(typeof auth.api.getSession).toBe("function");

		await moduleRef.close();
	});

	it("throws when DATABASE_URL is missing", async () => {
		delete process.env.DATABASE_URL;

		await expect(
			Test.createTestingModule({
				imports: [TestAuthModule],
			}).compile(),
		).rejects.toThrow("DATABASE_URL environment variable is required");
	});
});
