import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { emptyState } from "./empty-content.ts";
import { OutlineStore } from "./outline-store.ts";
import { indexedDbPersistence, memoryPersistence } from "./persistence.ts";
import type { Node, OutlinePersistence, OutlineSnapshot } from "./types.ts";

/** An adapter that records every write. */
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

function node(id: string, overrides: Partial<Node> = {}): Node {
	return {
		id,
		parentId: null,
		childIds: [],
		content: emptyState(),
		collapsed: false,
		updatedAt: 0,
		...overrides,
	};
}

describe("OutlineStore persistence", () => {
	it("writes a snapshot on every mutation", () => {
		const persistence = recorder();
		const store = new OutlineStore(persistence);

		const id = store.create();
		store.setCollapsed(id, true);
		store.remove(id);

		expect(persistence.writes).toHaveLength(3);
	});

	it("writes plain data, not observables", () => {
		const persistence = recorder();
		const store = new OutlineStore(persistence);
		store.create();

		// A MobX proxy is not structured-cloneable; IndexedDB would reject it.
		expect(() => structuredClone(persistence.writes.at(-1))).not.toThrow();
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
		const persistence = indexedDbPersistence(factory);
		const first = new OutlineStore(persistence);
		const parent = first.create();
		first.create(parent);
		// The store fires writes without awaiting them.
		await vi.waitFor(async () =>
			expect((await persistence.load())?.nodes).toHaveLength(3),
		);

		const second = new OutlineStore(indexedDbPersistence(factory));
		await second.hydrate();

		expect(second.tree.map((each) => each.id)).toEqual([parent]);
		expect(second.tree[0]?.children).toHaveLength(1);
	});

	it("hydrates to an empty outline when there is nothing stored", async () => {
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

		await store.hydrate();

		expect(store.hydrated).toBe(true);
	});

	it("reads once however many callers ask", async () => {
		const persistence = memoryPersistence();
		const load = vi.spyOn(persistence, "load");
		const store = new OutlineStore(persistence);

		await Promise.all([store.hydrate(), store.hydrate()]);
		await store.hydrate();

		expect(load).toHaveBeenCalledTimes(1);
	});

	it("stays usable when the snapshot has no root", async () => {
		const store = new OutlineStore(memoryPersistence({ nodes: [node("a")] }));

		await store.hydrate();

		expect(store.create()).toBeTypeOf("string");
		expect(store.tree).toHaveLength(1);
	});
});
