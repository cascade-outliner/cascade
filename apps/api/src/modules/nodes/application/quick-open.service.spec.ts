import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { NodesRepository } from "../infrastructure/nodes.repository";
import { QuickOpenService } from "./quick-open.service";

describe("QuickOpenService", () => {
	it("rejects queries that normalize to fewer than 2 characters", async () => {
		const repository = {
			findQuickOpenMatches: vi.fn(),
			findQuickOpenAncestors: vi.fn(),
		} as unknown as NodesRepository;
		const service = new QuickOpenService(repository);

		await expect(service.search(" a ", "user-1")).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(repository.findQuickOpenMatches).not.toHaveBeenCalled();
	});

	it("returns an empty array when there are no matches", async () => {
		const repository = {
			findQuickOpenMatches: vi.fn().mockResolvedValue([]),
			findQuickOpenAncestors: vi.fn(),
		} as unknown as NodesRepository;
		const service = new QuickOpenService(repository);

		await expect(service.search("milk", "user-1")).resolves.toEqual([]);
		expect(repository.findQuickOpenAncestors).not.toHaveBeenCalled();
	});

	it("builds a result with slug, snippet, and reversed ancestor chain", async () => {
		const content = (text: string) => ({
			root: { type: "root", children: [{ type: "text", text }] },
		});
		const repository = {
			findQuickOpenMatches: vi.fn().mockResolvedValue([
				{
					id: "0f7f9f9a-1234-4abc-89ab-0f7f9f9a1234",
					parent_id: "parent-1",
					content: content("Buy milk today"),
					path: ["a"],
				},
			]),
			findQuickOpenAncestors: vi.fn().mockResolvedValue([
				{
					match_id: "0f7f9f9a-1234-4abc-89ab-0f7f9f9a1234",
					id: "parent-1",
					parent_id: null,
					content: content("Groceries"),
					depth: 1,
				},
			]),
		} as unknown as NodesRepository;
		const service = new QuickOpenService(repository);

		const results = await service.search("milk", "user-1");

		expect(results).toHaveLength(1);
		expect(results[0]).toMatchObject({
			id: "0f7f9f9a-1234-4abc-89ab-0f7f9f9a1234",
			ancestors: [{ id: "parent-1", text: "Groceries" }],
			omittedAncestorCount: 0,
		});
		expect(results[0].snippet.text).toContain("milk");
	});
});
