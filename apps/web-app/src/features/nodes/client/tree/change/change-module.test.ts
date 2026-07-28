import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { describe, expect, it, vi } from "vitest";
import {
	createInMemoryTreeRemote,
	createInMemoryTreeViewStore,
	createRecordingTreeHistory,
	createRecordingTreeMotion,
} from "./adapters/in-memory";
import { createVisibleTreeChangeModule } from "./change-module";

function row(
	id: string,
	parentId: string | null,
	depth: number,
	path: string[],
	overrides: Partial<VisibleNodeRow> = {},
): VisibleNodeRow {
	return {
		id,
		parentId,
		content: null,
		type: "text",
		metadata: null,
		expanded: true,
		order: id,
		dueDate: null,
		recurrence: null,
		tags: [],
		depth,
		path,
		hasChildren: false,
		isLastChild: true,
		...overrides,
	};
}

function baseRows(): VisibleNodeRow[] {
	return [
		row("root", null, 0, ["root"], { hasChildren: true }),
		row("a", "root", 1, ["root", "a"], { isLastChild: false }),
		row("b", "root", 1, ["root", "b"], { isLastChild: false }),
		row("c", "root", 1, ["root", "c"]),
	];
}

function setup(rows: VisibleNodeRow[] = baseRows()) {
	const remote = createInMemoryTreeRemote(rows);
	const store = createInMemoryTreeViewStore({ rows, nextCursor: null });
	const motion = createRecordingTreeMotion();
	const history = createRecordingTreeHistory();
	const module = createVisibleTreeChangeModule({
		remote,
		store,
		motion,
		history,
	});
	return { remote, store, motion, history, module };
}

async function flushMicrotasks(times = 10) {
	for (let i = 0; i < times; i++) await Promise.resolve();
}

describe("VisibleTreeChangeModule", () => {
	it("succeeds: projects optimistically, then folds the authoritative result into base", async () => {
		const { store, module } = setup();

		const outcome = await module.execute({
			kind: "setTags",
			id: "a",
			tags: ["urgent"],
		});

		expect(outcome.status).toBe("succeeded");
		expect(store.getRows().find((r) => r.id === "a")?.tags).toEqual(["urgent"]);
		expect(store.getBase().rows.find((r) => r.id === "a")?.tags).toEqual([
			"urgent",
		]);
		expect(store.invalidations()).toContainEqual({ existingTags: true });
		// One publish for the optimistic append, one for the success fold.
		expect(store.snapshots().length).toBeGreaterThanOrEqual(2);
	});

	it("failure repair: removes only the failed entry and refreshes authoritative base", async () => {
		const { remote, store, module } = setup();
		remote.setTags = vi.fn().mockRejectedValue(new Error("network down"));

		const outcome = await module.execute({
			kind: "setTags",
			id: "a",
			tags: ["urgent"],
		});

		expect(outcome.status).toBe("failed");
		expect(outcome.error?.kind).toBe("remote");
		// The in-memory server never applied the write, so the refresh restores the prior value.
		expect(store.getRows().find((r) => r.id === "a")?.tags).toEqual([]);
		expect(store.getBase().rows.find((r) => r.id === "a")?.tags).toEqual([]);
	});

	it("overlapping optimistic changes: a failed write can't overwrite a later optimistic value", async () => {
		const { remote, store, module } = setup();
		const originalUpdateContent = remote.updateContent.bind(remote);
		let calls = 0;
		remote.updateContent = vi.fn(async (id, content) => {
			calls += 1;
			if (calls === 1) throw new Error("first write failed");
			await originalUpdateContent(id, content);
		});

		const first = module.execute({
			kind: "updateContent",
			id: "a",
			content: { root: "first" },
		});
		const second = module.execute({
			kind: "updateContent",
			id: "a",
			content: { root: "second" },
		});

		const [firstOutcome, secondOutcome] = await Promise.all([first, second]);

		expect(firstOutcome.status).toBe("failed");
		expect(secondOutcome.status).toBe("succeeded");
		expect(store.getRows().find((r) => r.id === "a")?.content).toEqual({
			root: "second",
		});
		expect(store.getBase().rows.find((r) => r.id === "a")?.content).toEqual({
			root: "second",
		});
	});

	it("field concurrency: sequences same-field remote writes in call order", async () => {
		const { remote, module } = setup();
		const calls: unknown[] = [];
		const original = remote.updateContent.bind(remote);
		let releaseFirst: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});
		remote.updateContent = vi.fn(async (id, content) => {
			calls.push(content);
			if (calls.length === 1) await gate;
			await original(id, content);
		});

		const first = module.execute({
			kind: "updateContent",
			id: "a",
			content: { root: "first" },
		});
		const second = module.execute({
			kind: "updateContent",
			id: "a",
			content: { root: "second" },
		});

		await flushMicrotasks();
		// The second same-field write hasn't reached the remote yet.
		expect(calls).toEqual([{ root: "first" }]);

		releaseFirst();
		await Promise.all([first, second]);

		expect(calls).toEqual([{ root: "first" }, { root: "second" }]);
	});

	it("field concurrency: independent fields aren't blocked by a slow write on another field", async () => {
		const { remote, module } = setup();
		const order: string[] = [];
		const originalUpdateContent = remote.updateContent.bind(remote);
		remote.updateContent = vi.fn(async (id, content) => {
			await new Promise((resolve) => setTimeout(resolve, 20));
			await originalUpdateContent(id, content);
			order.push("updateContent");
		});
		const originalSetTags = remote.setTags.bind(remote);
		remote.setTags = vi.fn(async (id, tags) => {
			await originalSetTags(id, tags);
			order.push("setTags");
		});

		await Promise.all([
			module.execute({
				kind: "updateContent",
				id: "a",
				content: { root: "slow" },
			}),
			module.execute({ kind: "setTags", id: "a", tags: ["fast"] }),
		]);

		expect(order).toEqual(["setTags", "updateContent"]);
	});

	it("structural serialization: a later structural command waits for the previous one to fully reconcile", async () => {
		const { remote, module } = setup();
		const order: string[] = [];
		const originalMove = remote.move.bind(remote);
		let releaseFirst: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});
		remote.move = vi.fn(async (id, target) => {
			order.push(`start:${id}`);
			if (id === "b") await gate;
			await originalMove(id, target);
			order.push(`end:${id}`);
		});

		const first = module.execute({
			kind: "move",
			id: "b",
			target: { position: "append", parentId: "root" },
		});
		const second = module.execute({
			kind: "move",
			id: "c",
			target: { position: "append", parentId: "root" },
		});

		await flushMicrotasks();
		expect(order).toEqual(["start:b"]);

		releaseFirst();
		await Promise.all([first, second]);

		expect(order).toEqual(["start:b", "end:b", "start:c", "end:c"]);
	});

	it("history timing: registers a history entry only after semantic success", async () => {
		const { remote, history, module } = setup();
		remote.move = vi.fn().mockRejectedValue(new Error("boom"));

		const failed = await module.execute({
			kind: "move",
			id: "b",
			target: { position: "append", parentId: "root" },
		});
		expect(failed.status).toBe("failed");
		expect(history.entries()).toHaveLength(0);

		const { module: succeedingModule, history: succeedingHistory } = setup();
		const succeeded = await succeedingModule.execute({
			kind: "move",
			id: "b",
			target: { position: "append", parentId: "root" },
		});
		expect(succeeded.status).toBe("succeeded");
		expect(succeedingHistory.entries()).toHaveLength(1);
	});

	it("undo/redo re-enter the same execution path without re-registering history", async () => {
		const { store, history, module } = setup();

		await module.execute({ kind: "setTags", id: "a", tags: ["urgent"] });
		expect(history.entries()).toHaveLength(1);
		expect(store.getRows().find((r) => r.id === "a")?.tags).toEqual(["urgent"]);

		const [entry] = history.entries();
		await entry.undo();
		expect(store.getRows().find((r) => r.id === "a")?.tags).toEqual([]);
		expect(history.entries()).toHaveLength(1);

		await entry.redo();
		expect(store.getRows().find((r) => r.id === "a")?.tags).toEqual(["urgent"]);
		expect(history.entries()).toHaveLength(1);
	});

	it("motion failure: isolates a throwing motion adapter from the semantic outcome", async () => {
		const { remote, store, history } = setup();
		const motion = createRecordingTreeMotion({ throwOn: () => true });
		const module = createVisibleTreeChangeModule({
			remote,
			store,
			motion,
			history,
		});

		const outcome = await module.execute({
			kind: "setTags",
			id: "a",
			tags: ["urgent"],
		});

		expect(outcome.status).toBe("succeeded");
		expect(store.getRows().find((r) => r.id === "a")?.tags).toEqual(["urgent"]);
		expect(motion.calls().map((call) => call.phase)).toEqual([
			"before",
			"after",
		]);
	});

	it("motion failure on a failing command still surfaces the remote failure", async () => {
		const { remote, store, history } = setup();
		remote.setTags = vi.fn().mockRejectedValue(new Error("network down"));
		const motion = createRecordingTreeMotion({ throwOn: () => true });
		const module = createVisibleTreeChangeModule({
			remote,
			store,
			motion,
			history,
		});

		const outcome = await module.execute({
			kind: "setTags",
			id: "a",
			tags: ["urgent"],
		});

		expect(outcome.status).toBe("failed");
	});

	it("validation: a command targeting a missing row fails without reaching the remote", async () => {
		const { remote, module } = setup();
		const moveSpy = vi.spyOn(remote, "move");

		const outcome = await module.execute({
			kind: "move",
			id: "missing",
			target: { position: "append", parentId: "root" },
		});

		expect(outcome.status).toBe("failed");
		expect(outcome.error?.kind).toBe("validation");
		expect(moveSpy).not.toHaveBeenCalled();
	});

	it("loadMore appends the next page and deduplicates against already-loaded rows", async () => {
		const rows = baseRows();
		const remote = createInMemoryTreeRemote(rows);
		remote.fetchNextPage = vi.fn().mockResolvedValue({
			rows: [
				row("c", "root", 1, ["root", "c"]),
				row("d", "root", 1, ["root", "d"]),
			],
			nextCursor: null,
		});
		const store = createInMemoryTreeViewStore({
			rows,
			nextCursor: ["root", "c"],
		});
		const motion = createRecordingTreeMotion();
		const history = createRecordingTreeHistory();
		const module = createVisibleTreeChangeModule({
			remote,
			store,
			motion,
			history,
		});

		const outcome = await module.execute({ kind: "loadMore" });

		expect(outcome.status).toBe("succeeded");
		const ids = store.getRows().map((r) => r.id);
		expect(ids).toEqual(["root", "a", "b", "c", "d"]);
		expect(store.getBase().nextCursor).toBeNull();
	});
});
