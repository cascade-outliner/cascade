import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { emptyState } from "../empty-content.ts";
import type { Node, OutlineSnapshot } from "../types.ts";
import { indexedDbPersistence } from "./indexed-db.ts";

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

describe("indexedDbPersistence", () => {
	it("reads back nothing before anything is written", async () => {
		const adapter = indexedDbPersistence({ factory: new IDBFactory() });

		await expect(adapter.load()).resolves.toBeNull();
	});

	it("round-trips a snapshot", async () => {
		const adapter = indexedDbPersistence({ factory: new IDBFactory() });
		const snapshot: OutlineSnapshot = {
			nodes: [node("a", { childIds: ["b"] }), node("b", { parentId: "a" })],
		};

		await adapter.save(snapshot);

		await expect(adapter.load()).resolves.toEqual(snapshot);
	});

	it("survives a new adapter over the same database", async () => {
		const factory = new IDBFactory();
		const snapshot: OutlineSnapshot = { nodes: [node("a")] };

		const writer = indexedDbPersistence({ factory });
		await writer.save(snapshot);
		writer.close();

		const reader = indexedDbPersistence({ factory });
		await expect(reader.load()).resolves.toEqual(snapshot);
	});

	it("keeps only the newest snapshot", async () => {
		const adapter = indexedDbPersistence({ factory: new IDBFactory() });

		await adapter.save({ nodes: [node("a")] });
		await adapter.save({ nodes: [node("b")] });

		const loaded = await adapter.load();
		expect(loaded?.nodes.map((each) => each.id)).toEqual(["b"]);
	});

	it("keeps outlines under different keys apart", async () => {
		const factory = new IDBFactory();
		const first = indexedDbPersistence({ factory, snapshotKey: "first" });
		const second = indexedDbPersistence({ factory, snapshotKey: "second" });

		await first.save({ nodes: [node("a")] });

		await expect(second.load()).resolves.toBeNull();
	});

	it("reads a malformed record as nothing stored", async () => {
		const factory = new IDBFactory();
		const adapter = indexedDbPersistence({ factory });
		await adapter.save({ nodes: [node("a")] });
		await writeRaw(factory, { nodes: [{ id: 7 }] });

		await expect(adapter.load()).resolves.toBeNull();
	});

	it("rejects when the environment has no IndexedDB", async () => {
		const adapter = indexedDbPersistence({
			factory: undefined as unknown as IDBFactory,
		});

		await expect(adapter.save({ nodes: [] })).rejects.toThrow();
	});
});

/** Put a value straight into the store, bypassing the adapter's own shape. */
function writeRaw(factory: IDBFactory, value: unknown): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = factory.open("cascade", 1);
		request.onsuccess = () => {
			const database = request.result;
			const transaction = database.transaction("outline", "readwrite");
			transaction.objectStore("outline").put(value, "default");
			transaction.oncomplete = () => {
				database.close();
				resolve();
			};
			transaction.onerror = () => reject(transaction.error);
		};
		request.onerror = () => reject(request.error);
	});
}
