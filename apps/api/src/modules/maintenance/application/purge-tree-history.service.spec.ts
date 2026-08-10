import { Test } from "@nestjs/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TreeHistoryPurgeRepository } from "../infrastructure/tree-history-purge.repository";
import { PurgeTreeHistoryService } from "./purge-tree-history.service";

describe("PurgeTreeHistoryService", () => {
	const originalRetentionDays = process.env.TREE_HISTORY_RETENTION_DAYS;
	const findEventIdsOlderThan = vi.fn();
	const deleteEventsOlderThan = vi.fn();

	let service: PurgeTreeHistoryService;

	beforeEach(async () => {
		findEventIdsOlderThan.mockReset();
		deleteEventsOlderThan.mockReset();

		const moduleRef = await Test.createTestingModule({
			providers: [
				PurgeTreeHistoryService,
				{
					provide: TreeHistoryPurgeRepository,
					useValue: { findEventIdsOlderThan, deleteEventsOlderThan },
				},
			],
		}).compile();

		service = moduleRef.get(PurgeTreeHistoryService);
	});

	afterEach(() => {
		process.env.TREE_HISTORY_RETENTION_DAYS = originalRetentionDays;
	});

	it("deletes events older than the given retention window by default", async () => {
		deleteEventsOlderThan.mockResolvedValue(["event-1", "event-2"]);

		const result = await service.purge(7);

		expect(deleteEventsOlderThan).toHaveBeenCalledWith(expect.any(Date));
		expect(findEventIdsOlderThan).not.toHaveBeenCalled();
		expect(result).toEqual({
			days: 7,
			dryRun: false,
			purgedIds: ["event-1", "event-2"],
		});
	});

	it("only reads matching events without deleting when dryRun is true", async () => {
		findEventIdsOlderThan.mockResolvedValue(["event-1"]);

		const result = await service.purge(7, true);

		expect(findEventIdsOlderThan).toHaveBeenCalledWith(expect.any(Date));
		expect(deleteEventsOlderThan).not.toHaveBeenCalled();
		expect(result).toEqual({ days: 7, dryRun: true, purgedIds: ["event-1"] });
	});

	it("falls back to TREE_HISTORY_RETENTION_DAYS when days isn't provided", async () => {
		process.env.TREE_HISTORY_RETENTION_DAYS = "14";
		deleteEventsOlderThan.mockResolvedValue([]);

		const result = await service.purge();

		expect(result.days).toBe(14);
	});

	it("defaults to 30 days when TREE_HISTORY_RETENTION_DAYS is unset", async () => {
		process.env.TREE_HISTORY_RETENTION_DAYS = undefined;
		delete process.env.TREE_HISTORY_RETENTION_DAYS;
		deleteEventsOlderThan.mockResolvedValue([]);

		const result = await service.purge();

		expect(result.days).toBe(30);
	});

	it("rejects a negative days value", async () => {
		await expect(service.purge(-1)).rejects.toThrow(
			"days must be a non-negative integer",
		);
	});

	it("rejects a non-integer TREE_HISTORY_RETENTION_DAYS value", async () => {
		process.env.TREE_HISTORY_RETENTION_DAYS = "not-a-number";

		await expect(service.purge()).rejects.toThrow(
			"TREE_HISTORY_RETENTION_DAYS must be a non-negative integer",
		);
	});
});
