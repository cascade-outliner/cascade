import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { emptyState } from "./empty-content.ts";
import { indexedDbPersistence, memoryPersistence } from "./persistence.ts";
import type { Node, OutlineSnapshot } from "./types.ts";

function node(id: string, overrides: Partial<Node> = {}): Node {
	return {
		id,
		parentId: null,
		childIds: [],
		content: emptyState(),
		collapsed: false,
		updatedAt: 1,
		...overrides,
	};
}

describe("memoryPersistence", () => {
	it("reads back what it was given", async () => {
		const snapshot: OutlineSnapshot = { nodes: [node("a")] };
		const adapter = memoryPersistence();

		await expect(adapter.load()).resolves.toBeNull();
		await adapter.save(snapshot);

		await expect(adapter.load()).resolves.toBe(snapshot);
	});
});

describe("indexedDbPersistence", () => {
	it("reads back nothing before anything is written", async () => {
		await expect(
			indexedDbPersistence(new IDBFactory()).load(),
		).resolves.toBeNull();
	});

	it("round-trips a snapshot", async () => {
		const adapter = indexedDbPersistence(new IDBFactory());
		const snapshot: OutlineSnapshot = {
			nodes: [node("a", { childIds: ["b"] }), node("b", { parentId: "a" })],
		};

		await adapter.save(snapshot);

		await expect(adapter.load()).resolves.toEqual(snapshot);
	});

	it("survives a new adapter over the same database", async () => {
		const factory = new IDBFactory();
		const snapshot: OutlineSnapshot = { nodes: [node("a")] };

		await indexedDbPersistence(factory).save(snapshot);

		await expect(indexedDbPersistence(factory).load()).resolves.toEqual(
			snapshot,
		);
	});

	it("keeps only the newest snapshot", async () => {
		const adapter = indexedDbPersistence(new IDBFactory());

		await adapter.save({ nodes: [node("a")] });
		await adapter.save({ nodes: [node("b")] });

		const loaded = await adapter.load();
		expect(loaded?.nodes.map((each) => each.id)).toEqual(["b"]);
	});

	it("reads a record it cannot make sense of as nothing stored", async () => {
		const adapter = indexedDbPersistence(new IDBFactory());

		await adapter.save({ notes: ["nope"] } as unknown as OutlineSnapshot);

		await expect(adapter.load()).resolves.toBeNull();
	});

	it("rejects where there is no IndexedDB", async () => {
		const adapter = indexedDbPersistence(undefined as unknown as IDBFactory);

		await expect(adapter.save({ nodes: [] })).rejects.toThrow();
	});
});
