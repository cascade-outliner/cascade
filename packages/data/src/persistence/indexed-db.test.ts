import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyState } from "../empty-content.ts";
import type { Node } from "../types.ts";
import {
	createIndexedDbPersistence,
	isIndexedDbAvailable,
} from "./indexed-db.ts";

const DATABASE_NAME = "cascade-outline";

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

/** Reads the object store directly, to see what the adapter actually wrote. */
function readRecords(factory: IDBFactory): Promise<Node[]> {
	return withStore(factory, "readonly", (store) => store.getAll());
}

/** Writes behind the adapter's back, to set up records it did not commit. */
async function putRecord(factory: IDBFactory, record: Node): Promise<void> {
	await withStore(factory, "readwrite", (store) => store.put(record));
}

function withStore<T>(
	factory: IDBFactory,
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const open = factory.open(DATABASE_NAME, 1);
		open.onupgradeneeded = () => {
			open.result.createObjectStore("nodes", { keyPath: "id" });
		};
		open.onerror = () => reject(open.error);
		open.onsuccess = () => {
			const database = open.result;
			const request = run(
				database.transaction("nodes", mode).objectStore("nodes"),
			);
			request.onsuccess = () => {
				resolve(request.result);
				database.close();
			};
			request.onerror = () => {
				reject(request.error);
				database.close();
			};
		};
	});
}

describe("createIndexedDbPersistence", () => {
	let factory: IDBFactory;

	beforeEach(() => {
		factory = new IDBFactory();
	});

	it("reports IndexedDB as unavailable outside a browser", () => {
		expect(isIndexedDbAvailable(undefined)).toBe(false);
		expect(isIndexedDbAvailable(factory)).toBe(true);
	});

	it("loads null until something has been saved", async () => {
		const persistence = createIndexedDbPersistence({ factory });

		await expect(persistence.load()).resolves.toBeNull();
	});

	it("round-trips an outline to another adapter over the same database", async () => {
		const nodes = [
			node("root", { childIds: ["a"] }),
			node("a", { parentId: "root", collapsed: true }),
		];
		await createIndexedDbPersistence({ factory }).save({ nodes });

		const reopened = await createIndexedDbPersistence({ factory }).load();

		expect(reopened?.nodes).toHaveLength(2);
		expect(reopened?.nodes.find((each) => each.id === "a")).toMatchObject({
			parentId: "root",
			collapsed: true,
		});
	});

	it("keeps outlines in separate databases apart", async () => {
		await createIndexedDbPersistence({ factory, databaseName: "one" }).save({
			nodes: [node("a")],
		});

		const other = createIndexedDbPersistence({
			factory,
			databaseName: "two",
		});

		await expect(other.load()).resolves.toBeNull();
	});

	it("deletes the records of nodes that are gone", async () => {
		const persistence = createIndexedDbPersistence({ factory });
		await persistence.save({ nodes: [node("a"), node("b")] });

		await persistence.save({ nodes: [node("a")] });

		expect((await readRecords(factory)).map((each) => each.id)).toEqual(["a"]);
	});

	it("rewrites only the records whose updatedAt moved", async () => {
		const persistence = createIndexedDbPersistence({ factory });
		await persistence.save({ nodes: [node("a"), node("b")] });
		// Marks both records, so a rewrite of either is visible.
		await putRecord(factory, node("a", { updatedAt: 1, collapsed: true }));
		await putRecord(factory, node("b", { updatedAt: 1, collapsed: true }));

		await persistence.save({ nodes: [node("a"), node("b", { updatedAt: 2 })] });

		const records = await readRecords(factory);
		expect(records.find((each) => each.id === "a")?.collapsed).toBe(true);
		expect(records.find((each) => each.id === "b")?.collapsed).toBe(false);
	});

	it("takes over records it did not write when saving without loading first", async () => {
		await putRecord(factory, node("stale"));
		await putRecord(factory, node("a", { collapsed: true }));

		// A fresh adapter: it has committed nothing, so both records are unknown.
		await createIndexedDbPersistence({ factory }).save({
			nodes: [node("a", { collapsed: false })],
		});

		const records = await readRecords(factory);
		expect(records.map((each) => each.id)).toEqual(["a"]);
		expect(records[0]?.collapsed).toBe(false);
	});

	it("does not remember a node whose save failed", async () => {
		const persistence = createIndexedDbPersistence({ factory });
		const uncloneable = node("bad", {
			content: { root: () => {} } as unknown as Node["content"],
		});

		await expect(
			persistence.save({ nodes: [node("a"), uncloneable] }),
		).rejects.toThrow();
		// Whatever the failed save did or did not write, the adapter must not
		// count "a" as committed: leave a mark and see the next save overwrite it
		// even though `updatedAt` has not moved.
		await putRecord(factory, node("a", { updatedAt: 1, collapsed: true }));
		await persistence.save({ nodes: [node("a", { updatedAt: 1 })] });

		const records = await readRecords(factory);
		expect(records.find((each) => each.id === "a")?.collapsed).toBe(false);
	});

	it("rejects when the environment has no IndexedDB", async () => {
		const persistence = createIndexedDbPersistence({ factory: undefined });

		await expect(persistence.load()).rejects.toThrow(/unavailable/);
	});
});
