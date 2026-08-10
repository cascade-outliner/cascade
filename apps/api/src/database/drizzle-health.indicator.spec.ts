import { HealthIndicatorService, TerminusModule } from "@nestjs/terminus";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";
import { DRIZZLE } from "./drizzle.provider";
import { DrizzleHealthIndicator } from "./drizzle-health.indicator";

describe("DrizzleHealthIndicator", () => {
	it("reports up when the database ping succeeds", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [TerminusModule],
			providers: [
				DrizzleHealthIndicator,
				{
					provide: DRIZZLE,
					useValue: { execute: vi.fn().mockResolvedValue(undefined) },
				},
			],
		}).compile();

		const indicator = moduleRef.get(DrizzleHealthIndicator);
		const result = await indicator.pingCheck("database");

		expect(result.database.status).toBe("up");

		await moduleRef.close();
	});

	it("reports down when the database ping rejects", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [TerminusModule],
			providers: [
				DrizzleHealthIndicator,
				{
					provide: DRIZZLE,
					useValue: {
						execute: vi.fn().mockRejectedValue(new Error("connection refused")),
					},
				},
			],
		}).compile();

		const indicator = moduleRef.get(DrizzleHealthIndicator);
		const result = await indicator.pingCheck("database");

		expect(result.database.status).toBe("down");
		expect(result.database.message).toBe("connection refused");

		await moduleRef.close();
	});

	it("reports down when the database ping times out", async () => {
		vi.useFakeTimers();

		const moduleRef = await Test.createTestingModule({
			imports: [TerminusModule],
			providers: [
				DrizzleHealthIndicator,
				{
					provide: DRIZZLE,
					// Never resolves, forcing the indicator's own timeout to win the race.
					useValue: { execute: vi.fn(() => new Promise(() => {})) },
				},
			],
		}).compile();

		const indicator = moduleRef.get(DrizzleHealthIndicator);
		const resultPromise = indicator.pingCheck("database");
		await vi.advanceTimersByTimeAsync(5_000);
		const result = await resultPromise;

		expect(result.database.status).toBe("down");
		expect(result.database.message).toBe("Database ping timed out");

		vi.useRealTimers();
		await moduleRef.close();
	});

	it("is resolvable directly from the module without the health-indicator-service export", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [TerminusModule],
			providers: [
				DrizzleHealthIndicator,
				{ provide: DRIZZLE, useValue: { execute: vi.fn() } },
			],
		}).compile();

		expect(moduleRef.get(HealthIndicatorService)).toBeDefined();

		await moduleRef.close();
	});
});
