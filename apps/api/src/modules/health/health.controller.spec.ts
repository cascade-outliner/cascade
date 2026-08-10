import { ServiceUnavailableException } from "@nestjs/common";
import { HealthCheckService, TerminusModule } from "@nestjs/terminus";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";
import { DrizzleHealthIndicator } from "../../database/drizzle-health.indicator";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
	it("reports ok status with a numeric uptime", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [TerminusModule],
			controllers: [HealthController],
			providers: [{ provide: DrizzleHealthIndicator, useValue: {} }],
		}).compile();

		const controller = moduleRef.get(HealthController);
		const result = controller.check();

		expect(result.status).toBe("ok");
		expect(typeof result.uptimeSeconds).toBe("number");
		expect(() => new Date(result.timestamp).toISOString()).not.toThrow();

		await moduleRef.close();
	});

	it("reports the readiness endpoint as healthy when the database ping succeeds", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [TerminusModule],
			controllers: [HealthController],
			providers: [
				{
					provide: DrizzleHealthIndicator,
					useValue: {
						pingCheck: vi
							.fn()
							.mockResolvedValue({ database: { status: "up" } }),
					},
				},
			],
		}).compile();

		const controller = moduleRef.get(HealthController);
		const result = await controller.ready();

		expect(result.status).toBe("ok");
		expect(result.details.database.status).toBe("up");

		await moduleRef.close();
	});

	it("throws a ServiceUnavailableException when the database ping fails", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [TerminusModule],
			controllers: [HealthController],
			providers: [
				{
					provide: DrizzleHealthIndicator,
					useValue: {
						pingCheck: vi.fn().mockResolvedValue({
							database: { status: "down", message: "Database ping timed out" },
						}),
					},
				},
			],
		}).compile();

		const controller = moduleRef.get(HealthController);

		await expect(controller.ready()).rejects.toBeInstanceOf(
			ServiceUnavailableException,
		);

		await moduleRef.close();
	});

	it("passes through unexpected errors from the health check service", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [HealthController],
			providers: [
				{
					provide: HealthCheckService,
					useValue: { check: vi.fn().mockRejectedValue(new Error("boom")) },
				},
				{ provide: DrizzleHealthIndicator, useValue: { pingCheck: vi.fn() } },
			],
		}).compile();

		const controller = moduleRef.get(HealthController);

		await expect(controller.ready()).rejects.toThrow("boom");

		await moduleRef.close();
	});
});
