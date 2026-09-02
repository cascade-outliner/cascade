import { describe, expect, it } from "vitest";
import { emptyState } from "../empty-content.ts";
import type { Transaction } from "../sync/transaction.ts";
import { OutlineStore } from "./outline-store.ts";

function setup() {
	const transactions: Transaction[] = [];
	const store = new OutlineStore({ push: (tx) => transactions.push(tx) });
	return { store, transactions };
}

describe("OutlineStore", () => {
	it("creates top-level nodes in order", () => {
		const { store, transactions } = setup();
		const a = store.create();
		const b = store.create();
		const c = store.create(null, 1);

		expect(store.tree.map((n) => n.id)).toEqual([a, c, b]);
		expect(transactions.map((tx) => tx.kind)).toEqual([
			"create",
			"create",
			"create",
		]);
	});

	it("nests children and reflects collapsed state", () => {
		const { store } = setup();
		const parent = store.create();
		const child = store.create(parent);
		store.setCollapsed(parent, true);

		expect(store.tree).toEqual([
			expect.objectContaining({
				id: parent,
				collapsed: true,
				children: [expect.objectContaining({ id: child, children: [] })],
			}),
		]);
	});

	it("throws on unknown parent for create", () => {
		const { store } = setup();
		expect(() => store.create("missing")).toThrow();
	});

	it("moves nodes between parents and refuses cycles", () => {
		const { store, transactions } = setup();
		const a = store.create();
		const b = store.create();
		const c = store.create(b);

		expect(store.move(b, c)).toBe(false);
		expect(store.move(b, b)).toBe(false);
		expect(store.move(a, b, 0)).toBe(true);
		expect(store.childrenOf(b).map((n) => n.id)).toEqual([a, c]);
		expect(store.tree.map((n) => n.id)).toEqual([b]);

		const last = transactions.at(-1);
		expect(last?.kind).toBe("update");
		if (last?.kind === "update") {
			expect(last.changes.parentId).toBe(b);
			expect(last.previous.parentId).toBeNull();
		}
	});

	it("reorders siblings under the same parent", () => {
		const { store } = setup();
		const a = store.create();
		const b = store.create();
		const c = store.create();

		expect(store.move(c, null, 0)).toBe(true);
		expect(store.tree.map((n) => n.id)).toEqual([c, a, b]);
		expect(store.move(a, null)).toBe(true);
		expect(store.tree.map((n) => n.id)).toEqual([c, b, a]);
	});

	it("rebalances sort orders when precision runs out", () => {
		const { store } = setup();
		const a = store.create();
		store.create();
		for (let i = 0; i < 80; i++) {
			store.create(null, 1);
		}
		const orders = store.childrenOf(null).map((n) => n.sortOrder);
		expect(new Set(orders).size).toBe(orders.length);
		expect(store.childrenOf(null)[0]?.id).toBe(a);
	});

	it("removes a subtree and emits deletes children-first", () => {
		const { store, transactions } = setup();
		const a = store.create();
		const b = store.create(a);
		const c = store.create(b);
		transactions.length = 0;

		store.remove(a);

		expect(store.nodes.size).toBe(0);
		expect(transactions.map((tx) => [tx.kind, tx.modelId])).toEqual([
			["delete", c],
			["delete", b],
			["delete", a],
		]);
	});

	it("setContent emits an update with previous content", () => {
		const { store, transactions } = setup();
		const a = store.create();
		const before = store.get(a)?.content;
		const next = emptyState();
		store.setContent(a, next);

		const last = transactions.at(-1);
		expect(last?.kind).toBe("update");
		if (last?.kind === "update") {
			expect(last.changes.content).toBe(next);
			expect(last.previous.content).toBe(before);
		}
		expect(store.get(a)?.content).toBe(next);
	});

	it("applies sync actions idempotently and tracks lastSyncId", () => {
		const { store } = setup();
		store.applySyncActions([
			{
				id: 1,
				model: "node",
				modelId: "x",
				action: "I",
				data: {
					id: "x",
					parentId: null,
					sortOrder: 0,
					content: emptyState(),
					collapsed: false,
					updatedAt: 1,
				},
			},
			{
				id: 2,
				model: "node",
				modelId: "x",
				action: "U",
				data: { collapsed: true },
			},
			{
				id: 2,
				model: "node",
				modelId: "x",
				action: "U",
				data: { collapsed: false },
			},
		]);
		expect(store.lastSyncId).toBe(2);
		expect(store.get("x")?.collapsed).toBe(true);

		store.applySyncActions([
			{ id: 3, model: "node", modelId: "x", action: "D" },
		]);
		expect(store.nodes.size).toBe(0);
		expect(store.lastSyncId).toBe(3);
	});

	it("reapply and revert round-trip a transaction", () => {
		const { store, transactions } = setup();
		const a = store.create();
		store.setCollapsed(a, true);
		const [create, update] = transactions as [Transaction, Transaction];

		store.revert(update);
		expect(store.get(a)?.collapsed).toBe(false);
		store.revert(create);
		expect(store.nodes.size).toBe(0);

		store.reapply(create);
		store.reapply(update);
		expect(store.get(a)?.collapsed).toBe(true);
	});
});
