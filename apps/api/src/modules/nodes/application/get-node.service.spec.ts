import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { NodesRepository } from "../infrastructure/nodes.repository";
import { GetNodeService } from "./get-node.service";

describe("GetNodeService", () => {
	it("returns the node when found", async () => {
		const node = { id: "n1", parentId: null };
		const repository = {
			findById: vi.fn().mockResolvedValue(node),
		} as unknown as NodesRepository;
		const service = new GetNodeService(repository);

		await expect(service.get("n1", "user-1")).resolves.toBe(node);
		expect(repository.findById).toHaveBeenCalledWith("n1", "user-1");
	});

	it("throws NotFoundException when the repository finds nothing", async () => {
		const repository = {
			findById: vi.fn().mockResolvedValue(null),
		} as unknown as NodesRepository;
		const service = new GetNodeService(repository);

		await expect(service.get("missing", "user-1")).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});
});
