import { describe, expect, it } from "vitest";
import { OutlineStore } from "./outline-store.ts";

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

	it("keeps keys short under repeated appends", async () => {
		const store = new OutlineStore();
		await ready(store);
		let id = "";
		for (let i = 0; i < 300; i++) id = store.create();
		expect(store.nodes.get(id)?.order.length).toBeLessThan(6);
	});
});
