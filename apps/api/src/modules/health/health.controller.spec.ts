import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
	it("reports ok status with a numeric uptime", async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [HealthController],
		}).compile();

		const controller = moduleRef.get(HealthController);
		const result = controller.check();

		expect(result.status).toBe("ok");
		expect(typeof result.uptimeSeconds).toBe("number");
		expect(() => new Date(result.timestamp).toISOString()).not.toThrow();
	});
});
