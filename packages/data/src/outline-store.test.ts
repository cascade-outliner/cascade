import { describe, expect, it, vi } from "vitest";
import { textState } from "./empty-content.ts";
import { MemoryPersistence } from "./memory-persistence.ts";
import { OutlineStore } from "./outline-store.ts";

async function open(persistence = new MemoryPersistence()) {
	const store = new OutlineStore(persistence);
	await store.ready;
	return { store, persistence };
}

/** Direct child ids of `id` (root nodes when `null`), in order. */
function childrenOf(store: OutlineStore, id: string | null = null): string[] {
	return store
		.rows(id)
		.filter((row) => row.depth === 0)
		.map((row) => row.node.id);
}

/** a, b, c at the root; b has children b1, b2. */
async function seed() {
	const opened = await open();
	const { store } = opened;
	const a = store.create();
	const b = store.create();
	const c = store.create();
	const b1 = store.create(b);
	const b2 = store.create(b);
	return { ...opened, a, b, c, b1, b2 };
}

describe("OutlineStore", () => {
	it("starts from what persistence holds", async () => {
		const persistence = new MemoryPersistence();
		const first = await open(persistence);
		const id = first.store.create();
		first.store.setContent(id, textState("hello"));

		const second = await open(persistence);
		expect(second.store.status).toBe("ready");
		expect(childrenOf(second.store)).toEqual([id]);
		expect(second.store.get(id)?.content).toEqual(textState("hello"));
	});

	it("create appends to its parent", async () => {
		const { store, a, b, c, b1, b2 } = await seed();
		expect(childrenOf(store)).toEqual([a, b, c]);
		expect(childrenOf(store, b)).toEqual([b1, b2]);
		expect(store.size).toBe(5);
		expect(() => store.create("missing")).toThrow();
	});

	it("rows walks depth-first and hides collapsed children", async () => {
		const { store, a, b, c, b1, b2 } = await seed();
		const ids = (rows: ReturnType<typeof store.rows>) =>
			rows.map((row) => `${row.node.id}@${row.depth}`);

		expect(ids(store.rows())).toEqual([
			`${a}@0`,
			`${b}@0`,
			`${b1}@1`,
			`${b2}@1`,
			`${c}@0`,
		]);
		expect(store.rows()[1]?.childCount).toBe(2);

		store.setCollapsed(b, true);
		expect(ids(store.rows())).toEqual([`${a}@0`, `${b}@0`, `${c}@0`]);
		expect(store.rows()[1]?.childCount).toBe(2);

		expect(ids(store.rows(b))).toEqual([`${b1}@0`, `${b2}@0`]);
		expect(store.rows("missing")).toEqual([]);
	});

	it("move places at an index, clamps it, and refuses cycles", async () => {
		const { store, a, b, c, b1 } = await seed();
		expect(store.move(c, null, 0)).toBe(true);
		expect(childrenOf(store)).toEqual([c, a, b]);
		expect(store.move(c, null, 99)).toBe(true);
		expect(childrenOf(store)).toEqual([a, b, c]);
		expect(store.move(a, b, 1)).toBe(true);
		expect(childrenOf(store, b)).toEqual([b1, a, expect.any(String)]);

		expect(store.move(b, b)).toBe(false);
		expect(store.move(b, b1)).toBe(false);
		expect(store.move(b, "missing")).toBe(false);
		expect(store.move("missing", null)).toBe(false);
	});

	it("indent nests under the previous sibling and outdent undoes it", async () => {
		const { store, a, b, c, b1, b2 } = await seed();
		expect(store.canIndent(a)).toBe(false);
		expect(store.indent(a)).toBe(false);
		expect(store.canIndent(c)).toBe(true);
		expect(store.indent(c)).toBe(true);
		expect(childrenOf(store, b)).toEqual([b1, b2, c]);

		expect(store.canOutdent(a)).toBe(false);
		expect(store.outdent(a)).toBe(false);
		expect(store.outdent(b1)).toBe(true);
		expect(childrenOf(store)).toEqual([a, b, b1]);
		expect(childrenOf(store, b)).toEqual([b2, c]);
		expect(store.parentOf(b1)).toBeNull();
		expect(store.parentOf(c)).toBe(b);
	});

	it("duplicate copies one node right after the original", async () => {
		const { store, a, b, c } = await seed();
		store.setTask(a, { done: true });
		const copy = store.duplicate(a) as string;
		expect(childrenOf(store)).toEqual([a, copy, b, c]);
		expect(childrenOf(store, copy)).toEqual([]);
		expect(store.get(copy)?.task).toEqual({ done: true });
		expect(store.duplicate("missing")).toBeNull();
	});

	it("duplicateWithChildren copies the subtree in order", async () => {
		const { store, a, b, c } = await seed();
		const copy = store.duplicateWithChildren(b) as string;
		expect(childrenOf(store)).toEqual([a, b, copy, c]);
		expect(childrenOf(store, copy)).toHaveLength(2);
		expect(childrenOf(store, b)).toHaveLength(2);
		expect(store.size).toBe(8);
	});

	it("remove deletes the whole subtree", async () => {
		const { store, a, b, c, b1, b2 } = await seed();
		store.remove(b);
		expect(childrenOf(store)).toEqual([a, c]);
		expect(store.get(b1)).toBeUndefined();
		expect(store.get(b2)).toBeUndefined();
		store.clearAll();
		expect(store.size).toBe(0);
	});

	it("writes once per action and persists exactly the outline", async () => {
		const { store, persistence, b, b1 } = await seed();
		const write = vi.spyOn(persistence, "write");

		store.setCollapsed(b, true);
		store.move(b1, null);
		store.duplicateWithChildren(b);
		store.remove(b);
		expect(write).toHaveBeenCalledTimes(4);

		await Promise.all(write.mock.results.map((each) => each.value));
		expect([...persistence.nodes.keys()].sort()).toEqual(
			[...store.nodes.keys()].sort(),
		);
		expect(persistence.nodes.get(b1)?.parentId).toBeNull();
	});
});
