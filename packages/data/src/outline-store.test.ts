import { describe, expect, it } from "vitest";
import { OutlineStore } from "./outline-store.ts";
import type { Node, OutlinePersistence } from "./types.ts";

function memory(initial: Node[] = []) {
	const rows = new Map(initial.map((node) => [node.id, node]));
	const persistence: OutlinePersistence = {
		load: async () => [...rows.values()],
		write: async ({ put, delete: removed }) => {
			for (const node of put) rows.set(node.id, node);
			for (const id of removed) rows.delete(id);
		},
	};
	return { rows, persistence };
}

async function ready(store: OutlineStore) {
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(store.status).toBe("ready");
}

function ids(store: OutlineStore, parentId: string | null = null) {
	const level = parentId ? findNode(store, parentId)?.children : store.tree;
	return (level ?? []).map((node) => node.id);
}

function findNode(store: OutlineStore, id: string) {
	const stack = [...store.tree];
	for (let node = stack.pop(); node; node = stack.pop()) {
		if (node.id === id) return node;
		stack.push(...node.children);
	}
	return undefined;
}

describe("OutlineStore ordering", () => {
	it("appends created nodes in order", async () => {
		const store = new OutlineStore();
		await ready(store);
		const a = store.create();
		const b = store.create();
		const c = store.create();
		expect(ids(store)).toEqual([a, b, c]);
	});

	it("moves a node to an index among siblings", async () => {
		const store = new OutlineStore();
		await ready(store);
		const a = store.create();
		const b = store.create();
		const c = store.create();

		expect(store.move(c, null, 0)).toBe(true);
		expect(ids(store)).toEqual([c, a, b]);

		expect(store.move(c, null, 1)).toBe(true);
		expect(ids(store)).toEqual([a, c, b]);

		expect(store.move(a, null)).toBe(true);
		expect(ids(store)).toEqual([c, b, a]);
	});

	it("reparents at an index", async () => {
		const store = new OutlineStore();
		await ready(store);
		const parent = store.create();
		const x = store.create(parent);
		const y = store.create(parent);
		const loose = store.create();

		expect(store.move(loose, parent, 1)).toBe(true);
		expect(ids(store)).toEqual([parent]);
		expect(ids(store, parent)).toEqual([x, loose, y]);
	});

	it("refuses to move a node into its own subtree", async () => {
		const store = new OutlineStore();
		await ready(store);
		const a = store.create();
		const b = store.create(a);
		expect(store.move(a, b, 0)).toBe(false);
		expect(store.move(a, a, 0)).toBe(false);
		expect(ids(store)).toEqual([a]);
	});

	it("places duplicates right after the original", async () => {
		const store = new OutlineStore();
		await ready(store);
		const a = store.create();
		const b = store.create();
		const copy = store.duplicate(a);
		expect(ids(store)).toEqual([a, copy, b]);
	});

	it("keeps sorting stable after many inserts into the same gap", async () => {
		const store = new OutlineStore();
		await ready(store);
		const first = store.create();
		const last = store.create();
		const inserted: string[] = [];
		for (let i = 0; i < 80; i++) {
			const id = store.create();
			store.move(id, null, 1);
			inserted.unshift(id);
		}
		expect(ids(store)).toEqual([first, ...inserted, last]);
	});

	it("backfills order for nodes persisted without one", async () => {
		const legacy = (id: string): Node =>
			({
				id,
				parentId: null,
				content: { root: {} },
				collapsed: false,
				updatedAt: 0,
			}) as unknown as Node;
		const { rows, persistence } = memory([legacy("a"), legacy("b")]);
		const store = new OutlineStore(persistence);
		await ready(store);
		expect(ids(store)).toEqual(["a", "b"]);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(rows.get("a")?.order).toBe(0);
		expect(rows.get("b")?.order).toBe(1);
	});
});
