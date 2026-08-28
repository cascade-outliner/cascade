import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { emptyState } from "./empty-content.ts";
import { OutlineStore } from "./outline-store.ts";
import { coalescedPersistence } from "./persistence/coalesced.ts";
import { indexedDbPersistence } from "./persistence/indexed-db.ts";
import { memoryPersistence } from "./persistence/memory.ts";
import type { OutlinePersistence, OutlineSnapshot } from "./types.ts";

/** An adapter that records writes and answers reads from the last of them. */
function recorder(): OutlinePersistence & { writes: OutlineSnapshot[] } {
	const writes: OutlineSnapshot[] = [];
	return {
		writes,
		load: async () => writes.at(-1) ?? null,
		save: async (snapshot) => {
			writes.push(snapshot);
		},
	};
}

describe("OutlineStore persistence", () => {
	it("writes a snapshot on every mutation", async () => {
		const persistence = recorder();
		const store = new OutlineStore(persistence);

		const id = store.create();
		store.setCollapsed(id, true);
		store.remove(id);

		expect(persistence.writes).toHaveLength(3);
	});

	it("writes plain data, not observables", async () => {
		const persistence = recorder();
		const store = new OutlineStore(persistence);
		store.create();

		const snapshot = persistence.writes.at(-1);

		// A MobX proxy is not structured-cloneable; IndexedDB would reject it.
		expect(() => structuredClone(snapshot)).not.toThrow();
	});

	it("restores an outline through the adapter", async () => {
		const persistence = memoryPersistence();
		const first = new OutlineStore(persistence);
		const parent = first.create();
		const child = first.create(parent);
		first.setCollapsed(parent, true);

		const second = new OutlineStore(persistence);
		await second.hydrate();

		expect(second.tree).toHaveLength(1);
		expect(second.tree[0]?.id).toBe(parent);
		expect(second.tree[0]?.collapsed).toBe(true);
		expect(second.tree[0]?.children.map((each) => each.id)).toEqual([child]);
	});

	it("survives a round trip through IndexedDB", async () => {
		const factory = new IDBFactory();
		// The composed stack the app runs: coalescing in front of IndexedDB.
		const first = new OutlineStore(
			coalescedPersistence(indexedDbPersistence({ factory }), 0),
		);
		const parent = first.create();
		first.create(parent);
		// The store fires writes without awaiting them; flush lands the last one.
		await first.flush();

		const second = new OutlineStore(indexedDbPersistence({ factory }));
		await second.hydrate();

		expect(second.tree.map((each) => each.id)).toEqual([parent]);
		expect(second.tree[0]?.children).toHaveLength(1);
	});

	it("marks itself hydrated when there is nothing stored", async () => {
		const store = new OutlineStore(memoryPersistence());

		expect(store.hydrated).toBe(false);
		await store.hydrate();

		expect(store.hydrated).toBe(true);
		expect(store.tree).toEqual([]);
	});

	it("hydrates to an empty outline when the adapter fails", async () => {
		const store = new OutlineStore({
			load: async () => {
				throw new Error("unreadable");
			},
			save: async () => {},
		});

		await expect(store.hydrate()).resolves.toBeUndefined();
		expect(store.hydrated).toBe(true);
	});

	it("keeps a local edit that beat the read back", async () => {
		const persistence = memoryPersistence({
			nodes: [
				{
					id: "stored",
					parentId: "__root__",
					childIds: [],
					content: emptyState(),
					collapsed: false,
					updatedAt: 0,
				},
			],
		});
		const store = new OutlineStore(persistence);

		const hydrating = store.hydrate();
		const typed = store.create();
		await hydrating;

		expect(store.tree.map((each) => each.id)).toEqual([typed]);
	});

	it("only hydrates once", async () => {
		const persistence = memoryPersistence();
		const load = vi.spyOn(persistence, "load");
		const store = new OutlineStore(persistence);

		await store.hydrate();
		await store.hydrate();

		expect(load).toHaveBeenCalledTimes(1);
	});

	it("rebuilds a missing root rather than losing the outline", async () => {
		const store = new OutlineStore(
			memoryPersistence({
				nodes: [
					{
						id: "orphan",
						parentId: "__root__",
						childIds: [],
						content: emptyState(),
						collapsed: false,
						updatedAt: 0,
					},
				],
			}),
		);

		await store.hydrate();

		expect(store.tree).toEqual([]);
		expect(store.create()).toBeTypeOf("string");
		expect(store.tree).toHaveLength(1);
	});

	it("flushes through to the adapter", async () => {
		const persistence = memoryPersistence();
		const flush = vi.fn(async () => {});
		const store = new OutlineStore({ ...persistence, flush });

		await store.flush();

		expect(flush).toHaveBeenCalledOnce();
	});
});
