import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyState } from "./empty-content.ts";
import { IndexedDbPersistence } from "./indexeddb.ts";
import { OutlineStore } from "./outline-store.ts";
import type { Node, OutlineSnapshot } from "./types.ts";

const ROOT_ID = "__root__";

function node(id: string, childIds: string[] = []): Node {
	return {
		id,
		parentId: id === ROOT_ID ? null : ROOT_ID,
		childIds,
		content: emptyState(),
		collapsed: false,
		updatedAt: 1,
	};
}

function snapshot(...nodes: Node[]): OutlineSnapshot {
	return { nodes };
}

function idsIn(loaded: OutlineSnapshot | null): string[] {
	return (loaded?.nodes ?? []).map((each) => each.id).sort();
}

describe("IndexedDbPersistence", () => {
	let factory: IDBFactory;
	const persistence = (databaseName = "test") =>
		new IndexedDbPersistence({ factory, databaseName });

	beforeEach(() => {
		factory = new IDBFactory();
	});

	it("reads back what it wrote", async () => {
		await persistence().save(snapshot(node(ROOT_ID, ["a"]), node("a")));

		expect(idsIn(await persistence().load())).toEqual([ROOT_ID, "a"]);
	});

	it("loads null when nothing has been stored", async () => {
		expect(await persistence().load()).toBeNull();
	});

	it("drops nodes the newest snapshot no longer names", async () => {
		const writer = persistence();
		await writer.save(
			snapshot(node(ROOT_ID, ["a", "b"]), node("a"), node("b")),
		);

		await writer.save(snapshot(node(ROOT_ID, ["a"]), node("a")));

		expect(idsIn(await persistence().load())).toEqual([ROOT_ID, "a"]);
	});

	it("keeps separate databases separate", async () => {
		await persistence("one").save(snapshot(node(ROOT_ID, ["a"]), node("a")));

		expect(await persistence("two").load()).toBeNull();
	});

	it("collapses a burst behind the write in flight, newest snapshot winning", async () => {
		const writer = persistence();

		await Promise.all([
			writer.save(snapshot(node(ROOT_ID, ["a"]), node("a"))),
			// Never written: "c" replaces it before the first write finishes.
			writer.save(snapshot(node(ROOT_ID, ["b"]), node("b"))),
			writer.save(snapshot(node(ROOT_ID, ["c"]), node("c"))),
		]);

		expect(idsIn(await persistence().load())).toEqual([ROOT_ID, "c"]);
	});

	it("keeps saving once the queue has drained", async () => {
		const writer = persistence();
		await writer.save(snapshot(node(ROOT_ID, ["a"]), node("a")));

		await writer.save(
			snapshot(node(ROOT_ID, ["a", "b"]), node("a"), node("b")),
		);

		expect(idsIn(await persistence().load())).toEqual([ROOT_ID, "a", "b"]);
	});

	it("flushes to nothing when no save is outstanding", async () => {
		await expect(persistence().flush()).resolves.toBeUndefined();
	});

	it("no-ops without an IndexedDB implementation", async () => {
		const server = new IndexedDbPersistence({ factory: undefined });

		await expect(server.load()).resolves.toBeNull();
		await expect(server.save(snapshot(node(ROOT_ID)))).resolves.toBeUndefined();
		await expect(server.flush()).resolves.toBeUndefined();
	});
});

describe("OutlineStore over IndexedDB", () => {
	let factory: IDBFactory;
	const store = () => new OutlineStore(new IndexedDbPersistence({ factory }));

	beforeEach(() => {
		factory = new IDBFactory();
	});

	it("hydrates a later store with the outline, structure and all", async () => {
		const first = store();
		const parent = first.create();
		const child = first.create(parent);
		first.setCollapsed(parent, true);
		await first.flush();

		const restored = store();
		await restored.hydrate();

		expect(restored.tree).toHaveLength(1);
		expect(restored.tree[0]?.id).toBe(parent);
		expect(restored.tree[0]?.collapsed).toBe(true);
		expect(restored.tree[0]?.children.map((each) => each.id)).toEqual([child]);
	});

	it("persists content edits", async () => {
		const first = store();
		const id = first.create();
		const content = emptyState();
		first.setContent(id, content);
		await first.flush();

		const restored = store();
		await restored.hydrate();

		expect(restored.nodes.get(id)?.content).toEqual(content);
	});

	it("keeps mutating and persisting after hydration", async () => {
		const first = store();
		first.create();
		await first.flush();

		const restored = store();
		await restored.hydrate();
		restored.create();
		await restored.flush();

		const again = store();
		await again.hydrate();
		expect(again.tree).toHaveLength(2);
	});

	it("persists removal of a subtree", async () => {
		const first = store();
		const parent = first.create();
		first.create(parent);
		await first.flush();

		first.remove(parent);
		await first.flush();

		const restored = store();
		await restored.hydrate();
		expect(restored.tree).toEqual([]);
		expect(restored.nodes.size).toBe(1);
	});

	it("leaves a store that has already been edited alone", async () => {
		const first = store();
		first.create();
		await first.flush();

		const racing = store();
		const typed = racing.create();
		await racing.hydrate();

		expect(racing.tree.map((each) => each.id)).toEqual([typed]);
	});

	it("ignores a stored outline with no root record", async () => {
		await new IndexedDbPersistence({ factory }).save(snapshot(node("orphan")));

		const restored = store();
		await restored.hydrate();

		expect(restored.tree).toEqual([]);
	});

	it("starts empty when the database cannot be opened", async () => {
		const unreadable = new OutlineStore({
			load: () => Promise.reject(new Error("blocked")),
			save: () => Promise.resolve(),
		});

		await expect(unreadable.hydrate()).resolves.toBeUndefined();
		expect(unreadable.tree).toEqual([]);
	});
});
