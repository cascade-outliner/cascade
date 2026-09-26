import { describe, expect, it, vi } from "vitest";
import { emptyState } from "../outline/content.ts";
import { OutlineStore } from "../outline/store.ts";
import type { Node } from "../outline/types.ts";
import { MemoryPersistence } from "../persistence/memory.ts";
import { SyncEngine } from "./engine.ts";
import { MemorySyncState } from "./state-memory.ts";
import { SyncedPersistence } from "./synced-persistence.ts";
import type { PullResponse, PushRequest, SyncTransport } from "./types.ts";

function node(
	id: string,
	updatedAt: number,
	parentId: string | null = null,
): Node {
	return {
		id,
		parentId,
		order: "a0",
		content: emptyState(),
		collapsed: false,
		updatedAt,
	};
}

function fakeTransport(pulls: PullResponse[] = []) {
	const pushes: PushRequest[] = [];
	const transport: SyncTransport = {
		push: vi.fn(async (request) => {
			pushes.push(request);
		}),
		pull: vi.fn(
			async () => pulls.shift() ?? { put: [], delete: [], cursor: null },
		),
	};
	return { transport, pushes };
}

function setup(pulls?: PullResponse[]) {
	const inner = new MemoryPersistence();
	const state = new MemorySyncState();
	const persistence = new SyncedPersistence(inner, state);
	const { transport, pushes } = fakeTransport(pulls);
	const engine = new SyncEngine({
		persistence,
		state,
		transport,
		pushDelayMs: 1,
	});
	return { inner, state, persistence, transport, pushes, engine };
}

describe("SyncEngine", () => {
	it("assigns a workspace id once and keeps it", async () => {
		const { engine, state } = setup();
		await engine.start();
		const id = engine.workspaceId;
		expect(id).toBeTruthy();
		expect((await state.getMeta()).workspaceId).toBe(id);
		engine.stop();

		const again = new SyncEngine({ ...setupWith(state) });
		await again.start();
		expect(again.workspaceId).toBe(id);
		again.stop();
	});

	it("switches to a pasted workspace id and pulls it from the start", async () => {
		const { engine, state, transport } = setup();
		await engine.start();
		await state.setMeta({ cursor: "old" });
		const other = "29636bee-4bf9-4999-8369-dfe25f00bff2";

		await engine.setWorkspaceId(other);

		expect(engine.workspaceId).toBe(other);
		expect((await state.getMeta()).workspaceId).toBe(other);
		expect(transport.pull).toHaveBeenLastCalledWith({
			workspaceId: other,
			since: null,
		});
		await expect(engine.setWorkspaceId("nope")).rejects.toThrow();
		engine.stop();
	});

	it("pushes queued writes and drains the outbox, collapsing per node", async () => {
		const { engine, persistence, state, pushes } = setup();
		await engine.start();
		await persistence.write({ put: [node("a", 1)], delete: [] });
		await persistence.write({ put: [node("a", 2), node("b", 2)], delete: [] });
		await persistence.write({ put: [], delete: ["b"] });
		expect((await state.peek()).length).toBe(2);

		await engine.push();
		expect(pushes).toHaveLength(1);
		expect(pushes[0]?.put.map((n) => [n.id, n.updatedAt])).toEqual([["a", 2]]);
		expect(pushes[0]?.delete.map((t) => t.id)).toEqual(["b"]);
		expect(await state.peek()).toEqual([]);
		engine.stop();
	});

	it("keeps the outbox when a push fails, then retries", async () => {
		const { engine, persistence, state, transport } = setup();
		vi.mocked(transport.push).mockRejectedValueOnce(new Error("offline"));
		await engine.start();
		await persistence.write({ put: [node("a", 1)], delete: [] });
		await engine.push();
		expect(engine.status).toBe("error");
		expect(await state.peek()).toHaveLength(1);

		await engine.push();
		expect(engine.status).toBe("idle");
		expect(await state.peek()).toHaveLength(0);
		engine.stop();
	});

	it("applies newer server nodes, ignores older ones, and advances the cursor", async () => {
		const { engine, inner, state, persistence } = setup([
			{ put: [node("a", 5), node("b", 1)], delete: [], cursor: "c1" },
		]);
		await inner.write({ put: [node("a", 3), node("b", 9)], delete: [] });
		const seen: string[] = [];
		persistence.subscribe((change) =>
			seen.push(...change.put.map((n) => n.id)),
		);

		await engine.start();
		expect((await inner.get("a"))?.updatedAt).toBe(5);
		expect((await inner.get("b"))?.updatedAt).toBe(9);
		expect(seen).toEqual(["a"]);
		expect((await state.getMeta()).cursor).toBe("c1");
		expect(await state.peek()).toEqual([]);
		engine.stop();
	});

	it("pages through pulls until an empty page and stops when the cursor stalls", async () => {
		const { engine, inner, state, transport } = setup([
			{ put: [node("a", 1)], delete: [], cursor: "c1" },
			{ put: [node("b", 1)], delete: [], cursor: "c2" },
			{ put: [node("b", 1)], delete: [], cursor: "c2" },
		]);
		await engine.start();
		expect(vi.mocked(transport.pull).mock.calls.map(([r]) => r.since)).toEqual([
			null,
			"c1",
			"c2",
		]);
		expect((await inner.load()).map((n) => n.id).sort()).toEqual(["a", "b"]);
		expect((await state.getMeta()).cursor).toBe("c2");
		engine.stop();
	});

	it("sends onboarding with the next push once, even while stopped when recorded", async () => {
		const { engine, persistence, state, pushes } = setup();
		await engine.recordOnboarding();
		expect((await state.getMeta()).onboarding?.synced).toBe(false);

		await engine.start();
		expect(pushes).toHaveLength(1);
		expect(pushes[0]?.onboarding?.completedAt).toBeTypeOf("number");
		expect((await state.getMeta()).onboarding?.synced).toBe(true);

		await persistence.write({ put: [node("a", 1)], delete: [] });
		await engine.push();
		expect(pushes).toHaveLength(2);
		expect(pushes[1]?.onboarding).toBeUndefined();
		engine.stop();
	});

	it("applies tombstones only when they are newer than the local edit", async () => {
		const { engine, inner } = setup([
			{
				put: [],
				delete: [
					{ id: "old", deletedAt: 10 },
					{ id: "edited", deletedAt: 10 },
				],
				cursor: "c1",
			},
		]);
		await inner.write({
			put: [node("old", 5), node("edited", 20)],
			delete: [],
		});
		await engine.start();
		expect(await inner.get("old")).toBeUndefined();
		expect((await inner.get("edited"))?.updatedAt).toBe(20);
		engine.stop();
	});

	it("merges pulled changes into the store through the persistence boundary", async () => {
		const { engine, persistence } = setup([
			{ put: [node("a", 5)], delete: [], cursor: "c1" },
		]);
		const store = new OutlineStore(persistence);
		await store.ready;
		expect(store.size).toBe(0);
		await engine.start();
		expect(store.get("a")?.updatedAt).toBe(5);
		engine.stop();
	});
});

function setupWith(state: MemorySyncState) {
	const persistence = new SyncedPersistence(new MemoryPersistence(), state);
	return { persistence, state, transport: fakeTransport().transport };
}
