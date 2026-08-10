import { ConflictException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { NodesRepository } from "../infrastructure/nodes.repository";
import { ResolveNodeSlugService } from "./resolve-node-slug.service";

const USER_ID = "user-1";
const FULL_UUID = "0f7f9f9a-1234-4abc-89ab-0f7f9f9a1234";

function makeRepository(overrides: Partial<NodesRepository> = {}) {
	return {
		findIdByIdAndUser: vi.fn().mockResolvedValue(null),
		findByIdFirstBlock: vi.fn().mockResolvedValue([]),
		...overrides,
	} as unknown as NodesRepository;
}

describe("ResolveNodeSlugService", () => {
	it("resolves a full UUID slug directly", async () => {
		const repository = makeRepository({
			findIdByIdAndUser: vi.fn().mockResolvedValue(FULL_UUID),
		});
		const service = new ResolveNodeSlugService(repository);

		await expect(service.resolve(FULL_UUID, null, USER_ID)).resolves.toEqual({
			id: FULL_UUID,
		});
	});

	it("throws NotFoundException for a full UUID that doesn't belong to the user", async () => {
		const repository = makeRepository();
		const service = new ResolveNodeSlugService(repository);

		await expect(
			service.resolve(FULL_UUID, null, USER_ID),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it("resolves a unique first-block prefix without needing slug text", async () => {
		const repository = makeRepository({
			findByIdFirstBlock: vi
				.fn()
				.mockResolvedValue([{ id: "0f7f9f9a-x", content: {} }]),
		});
		const service = new ResolveNodeSlugService(repository);

		await expect(service.resolve("0f7f9f9a", null, USER_ID)).resolves.toEqual({
			id: "0f7f9f9a-x",
		});
	});

	it("throws ConflictException for an ambiguous prefix with no slug text", async () => {
		const repository = makeRepository({
			findByIdFirstBlock: vi.fn().mockResolvedValue([
				{ id: "0f7f9f9a-a", content: {} },
				{ id: "0f7f9f9a-b", content: {} },
			]),
		});
		const service = new ResolveNodeSlugService(repository);

		await expect(
			service.resolve("0f7f9f9a", null, USER_ID),
		).rejects.toBeInstanceOf(ConflictException);
	});

	it("disambiguates a prefix match using slug text", async () => {
		const content = (text: string) => ({
			root: { type: "root", children: [{ type: "text", text }] },
		});
		const repository = makeRepository({
			findByIdFirstBlock: vi.fn().mockResolvedValue([
				{ id: "0f7f9f9a-a", content: content("Alpha") },
				{ id: "0f7f9f9a-b", content: content("Beta") },
			]),
		});
		const service = new ResolveNodeSlugService(repository);

		await expect(service.resolve("0f7f9f9a", "beta", USER_ID)).resolves.toEqual(
			{ id: "0f7f9f9a-b" },
		);
	});

	it("throws NotFoundException when slug text matches no prefix candidate", async () => {
		const content = (text: string) => ({
			root: { type: "root", children: [{ type: "text", text }] },
		});
		const repository = makeRepository({
			findByIdFirstBlock: vi.fn().mockResolvedValue([
				{ id: "0f7f9f9a-a", content: content("Alpha") },
				{ id: "0f7f9f9a-b", content: content("Beta") },
			]),
		});
		const service = new ResolveNodeSlugService(repository);

		await expect(
			service.resolve("0f7f9f9a", "nonexistent", USER_ID),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
