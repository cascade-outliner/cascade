import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";
import { PurgeTreeHistoryService } from "./application/purge-tree-history.service";
import { MaintenanceController } from "./maintenance.controller";

describe("MaintenanceController", () => {
	it("purges and returns a purgedCount summarizing the result", async () => {
		const purge = vi.fn().mockResolvedValue({
			days: 7,
			dryRun: false,
			purgedIds: ["event-1", "event-2", "event-3"],
		});

		const moduleRef = await Test.createTestingModule({
			controllers: [MaintenanceController],
			providers: [{ provide: PurgeTreeHistoryService, useValue: { purge } }],
		}).compile();

		const controller = moduleRef.get(MaintenanceController);
		const result = await controller.purgeTreeHistory({
			days: 7,
			dryRun: false,
		});

		expect(purge).toHaveBeenCalledWith(7, false);
		expect(result).toEqual({ days: 7, dryRun: false, purgedCount: 3 });

		await moduleRef.close();
	});

	it("defaults dryRun to false when omitted from the request body", async () => {
		const purge = vi
			.fn()
			.mockResolvedValue({ days: 30, dryRun: false, purgedIds: [] });

		const moduleRef = await Test.createTestingModule({
			controllers: [MaintenanceController],
			providers: [{ provide: PurgeTreeHistoryService, useValue: { purge } }],
		}).compile();

		const controller = moduleRef.get(MaintenanceController);
		await controller.purgeTreeHistory({});

		expect(purge).toHaveBeenCalledWith(undefined, false);

		await moduleRef.close();
	});
});
