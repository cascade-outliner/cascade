import { describe, expect, it, vi } from "vitest";
import { emptyState } from "../empty-content.ts";
import type { OutlinePersistence, OutlineSnapshot } from "../types.ts";
import { coalescedPersistence } from "./coalesced.ts";

function recorder(): OutlinePersistence & { writes: OutlineSnapshot[] } {
	const writes: OutlineSnapshot[] = [];
	return {
		writes,
		load: async () => null,
		save: async (snapshot) => {
			writes.push(snapshot);
		},
	};
}

/** A snapshot identifiable by the id of its single node. */
function snapshotOf(id: string): OutlineSnapshot {
	return {
		nodes: [
			{
				id,
				parentId: null,
				childIds: [],
				content: emptyState(),
				collapsed: false,
				updatedAt: 0,
			},
		],
	};
}

describe("coalescedPersistence", () => {
	it("turns a burst into one write of the newest snapshot", async () => {
		vi.useFakeTimers();
		const inner = recorder();
		const adapter = coalescedPersistence(inner, 50);

		await adapter.save(snapshotOf("a"));
		await adapter.save(snapshotOf("b"));
		await adapter.save(snapshotOf("c"));
		expect(inner.writes).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(50);

		expect(inner.writes).toEqual([snapshotOf("c")]);
		vi.useRealTimers();
	});

	it("does not extend the window while writes keep coming", async () => {
		vi.useFakeTimers();
		const inner = recorder();
		const adapter = coalescedPersistence(inner, 50);

		await adapter.save(snapshotOf("a"));
		await vi.advanceTimersByTimeAsync(40);
		await adapter.save(snapshotOf("b"));
		await vi.advanceTimersByTimeAsync(10);

		expect(inner.writes).toEqual([snapshotOf("b")]);
		vi.useRealTimers();
	});

	it("writes immediately on flush", async () => {
		const inner = recorder();
		const adapter = coalescedPersistence(inner, 10_000);

		await adapter.save(snapshotOf("a"));
		await adapter.flush?.();

		expect(inner.writes).toEqual([snapshotOf("a")]);
	});

	it("flushes to nothing when there is nothing pending", async () => {
		const inner = recorder();
		const adapter = coalescedPersistence(inner, 10_000);

		await adapter.flush?.();

		expect(inner.writes).toHaveLength(0);
	});

	it("keeps writing after a failed write", async () => {
		const inner = recorder();
		const save = vi
			.spyOn(inner, "save")
			.mockRejectedValueOnce(new Error("disk full"));
		const adapter = coalescedPersistence(inner, 0);

		await adapter.save(snapshotOf("a"));
		await expect(adapter.flush?.()).rejects.toThrow("disk full");

		save.mockRestore();
		await adapter.save(snapshotOf("b"));
		await adapter.flush?.();

		expect(inner.writes).toEqual([snapshotOf("b")]);
	});

	it("reads straight through", async () => {
		const inner = recorder();
		const stored: OutlineSnapshot = { nodes: [] };
		vi.spyOn(inner, "load").mockResolvedValue(stored);

		await expect(coalescedPersistence(inner).load()).resolves.toBe(stored);
	});
});
