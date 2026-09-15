import { describe, expect, it } from "vitest";
import { REBALANCE_THRESHOLD } from "../util/order.ts";
import { OutlineStore } from "./store.ts";

function orders(store: OutlineStore, parentId: string | null = null): string[] {
	return store
		.rows()
		.filter((row) => (row.node.parentId ?? null) === parentId)
		.map((row) => row.node.order);
}

describe("OutlineStore rebalancing", () => {
	it("keeps order keys bounded when new items always jump to the front", () => {
		const store = new OutlineStore();
		store.create(null); // anchor, stays put
		for (let i = 0; i < 500; i++) {
			const id = store.create(null);
			store.move(id, null, 1);
		}
		for (const order of orders(store)) {
			expect(order.length).toBeLessThanOrEqual(REBALANCE_THRESHOLD);
		}
	});

	it("keeps order keys bounded under repeated duplication of the same node", () => {
		const store = new OutlineStore();
		const id = store.create(null);
		for (let i = 0; i < 500; i++) {
			store.duplicate(id);
		}
		for (const order of orders(store)) {
			expect(order.length).toBeLessThanOrEqual(REBALANCE_THRESHOLD);
		}
	});

	it("preserves sibling order across a rebalance", () => {
		const store = new OutlineStore();
		for (let i = 0; i < 200; i++) {
			store.create(null);
		}
		const before = store.rows().map((row) => row.node.id);
		for (let i = 0; i < 200; i++) {
			store.create(null);
		}
		const after = store.rows().map((row) => row.node.id);
		expect(after.slice(0, before.length)).toEqual(before);
	});
});
