import { describe, expect, it, vi } from "vitest";
import type { NodesRepository } from "../infrastructure/nodes.repository";
import { ListDueSoonService } from "./list-due-soon.service";

const content = (text: string) => ({
	root: { type: "root", children: [{ type: "text", text }] },
});

describe("ListDueSoonService", () => {
	it("filters out completed tasks and falls back to the default notification time", async () => {
		const repository = {
			findDueSoon: vi.fn().mockResolvedValue([
				{
					id: "task-1",
					content: content("Buy milk"),
					metadata: { completed: false },
					dueDate: "2026-08-11",
					dueTime: null,
					recurrence: null,
				},
				{
					id: "task-2",
					content: content("Already done"),
					metadata: { completed: true },
					dueDate: "2026-08-11",
					dueTime: "14:00",
					recurrence: null,
				},
			]),
		} as unknown as NodesRepository;
		const service = new ListDueSoonService(repository);

		const result = await service.list("user-1");

		expect(result.tasks).toHaveLength(1);
		expect(result.tasks[0]).toMatchObject({
			id: "task-1",
			label: "Buy milk",
			dueDate: "2026-08-11",
			dueTime: "09:00",
		});
	});
});
