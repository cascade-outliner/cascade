import { IDBFactory } from "fake-indexeddb";
import { isObservable } from "mobx";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OutlineStore } from "./outline-store.ts";
import { createIndexedDbPersistence } from "./persistence/indexed-db.ts";
import type {
	OutlinePersistence,
	OutlineSnapshot,
} from "./persistence/types.ts";

/** A persistence double that records what it is handed and when it finishes. */
function recorder(load: OutlinePersistence["load"] = async () => null): {
	persistence: OutlinePersistence;
	saves: OutlineSnapshot[];
	release: () => void;
} {
	const saves: OutlineSnapshot[] = [];
	let unblock: () => void = () => {};
	let inFlight = new Promise<void>((resolve) => {
		unblock = resolve;
	});

	return {
		saves,
		release: () => unblock(),
		persistence: {
			load,
			save: async (snapshot) => {
				saves.push(snapshot);
				await inFlight;
				inFlight = Promise.resolve();
			},
		},
	};
}

describe("OutlineStore", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("persists to IndexedDB and hydrates a second store from it", async () => {
		const factory = new IDBFactory();
		const written = new OutlineStore({
			persistence: createIndexedDbPersistence({ factory }),
		});
		const parentId = written.create();
		const childId = written.create(parentId);
		written.setCollapsed(parentId, true);
		await written.whenPersisted();

		const reopened = new OutlineStore({
			persistence: createIndexedDbPersistence({ factory }),
		});
		await reopened.hydrate();

		expect(reopened.hydrated).toBe(true);
		expect(reopened.tree).toHaveLength(1);
		expect(reopened.tree[0]?.id).toBe(parentId);
		expect(reopened.tree[0]?.collapsed).toBe(true);
		expect(reopened.tree[0]?.children[0]?.id).toBe(childId);
	});

	it("keeps editing after hydration without losing the stored outline", async () => {
		const factory = new IDBFactory();
		const first = new OutlineStore({
			persistence: createIndexedDbPersistence({ factory }),
		});
		const existingId = first.create();
		await first.whenPersisted();

		const second = new OutlineStore({
			persistence: createIndexedDbPersistence({ factory }),
		});
		await second.hydrate();
		const addedId = second.create();
		await second.whenPersisted();

		const third = new OutlineStore({
			persistence: createIndexedDbPersistence({ factory }),
		});
		await third.hydrate();

		expect(third.tree.map((each) => each.id)).toEqual([existingId, addedId]);
	});

	it("hydrates to an empty outline when nothing is stored", async () => {
		const store = new OutlineStore();

		await store.hydrate();

		expect(store.hydrated).toBe(true);
		expect(store.tree).toEqual([]);
	});

	it("suspends saving when the stored outline cannot be read", async () => {
		const { persistence, saves } = recorder(async () => {
			throw new Error("storage is unreadable");
		});
		const store = new OutlineStore({ persistence });

		await expect(store.hydrate()).rejects.toThrow("storage is unreadable");
		store.create();

		expect(store.persistenceSuspended).toBe(true);
		expect(store.hydrated).toBe(false);
		expect(saves).toHaveLength(0);
	});

	it("retries hydration after a failure and resumes saving", async () => {
		const load = vi
			.fn<OutlinePersistence["load"]>()
			.mockRejectedValueOnce(new Error("busy"))
			.mockResolvedValue(null);
		const { persistence, saves, release } = recorder(load);
		const store = new OutlineStore({ persistence });

		await expect(store.hydrate()).rejects.toThrow("busy");
		await store.hydrate();
		store.create();
		release();

		expect(store.persistenceSuspended).toBe(false);
		expect(saves).toHaveLength(1);
	});

	it("reports save failures instead of swallowing them", async () => {
		const onPersistError = vi.fn();
		const store = new OutlineStore({
			persistence: {
				load: async () => null,
				save: async () => {
					throw new Error("quota exceeded");
				},
			},
			onPersistError,
		});

		store.create();

		await vi.waitFor(() =>
			expect(onPersistError).toHaveBeenCalledWith(expect.any(Error)),
		);
	});

	it("coalesces edits made while a save is in flight", async () => {
		const { persistence, saves, release } = recorder();
		const store = new OutlineStore({ persistence });

		store.create();
		store.create();
		store.create();
		expect(saves).toHaveLength(1);
		release();

		await vi.waitFor(() => expect(saves).toHaveLength(2));
		// Root plus three nodes: the follow-up save carries every edit that
		// landed while the first one was in flight, not one save each.
		expect(saves[1]?.nodes).toHaveLength(4);
	});

	it("hands adapters plain data rather than observables", async () => {
		const { persistence, saves, release } = recorder();
		const store = new OutlineStore({ persistence });

		const id = store.create();
		release();

		const saved = saves[0]?.nodes.find((each) => each.id === id);
		expect(isObservable(saved)).toBe(false);
		expect(isObservable(saved?.childIds)).toBe(false);
		expect(() => structuredClone(saves[0])).not.toThrow();
	});

	it("stamps every write with a distinct updatedAt", () => {
		vi.spyOn(Date, "now").mockReturnValue(1_000);
		const store = new OutlineStore();

		const first = store.create();
		const second = store.create();

		const stamps = [first, second].map(
			(id) => store.nodes.get(id)?.updatedAt ?? 0,
		);
		expect(stamps[0]).toBe(1_000);
		expect(stamps[1]).toBeGreaterThan(stamps[0] ?? 0);
	});

	it("recovers the top-level order from a snapshot missing its root", async () => {
		const store = new OutlineStore({
			persistence: {
				load: async () => ({
					nodes: [
						{
							id: "orphan",
							parentId: "__root__",
							childIds: [],
							content: {} as never,
							collapsed: false,
							updatedAt: 5,
						},
					],
				}),
				save: async () => {},
			},
		});

		await store.hydrate();

		expect(store.tree.map((each) => each.id)).toEqual(["orphan"]);
	});
});
