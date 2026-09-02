import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOutline } from "../outline.ts";
import { ConsoleSyncTransport } from "./console-transport.ts";
import type {
	DeltaListener,
	SendResult,
	SyncTransport,
	TransactionBatch,
} from "./protocol.ts";

async function flushMicrotasks(rounds = 5) {
	for (let i = 0; i < rounds; i++) {
		await Promise.resolve();
	}
}

class FakeTransport implements SyncTransport {
	sent: TransactionBatch[] = [];
	listeners = new Set<DeltaListener>();
	syncId = 0;
	failNext = false;
	rejectNext = false;

	bootstrap = vi.fn(async () => ({ lastSyncId: this.syncId, nodes: [] }));
	delta = vi.fn(async () => ({ actions: [] }));

	async send(batch: TransactionBatch): Promise<SendResult> {
		if (this.failNext) {
			this.failNext = false;
			throw new Error("network down");
		}
		this.sent.push(batch);
		const reject = this.rejectNext;
		this.rejectNext = false;
		return {
			results: batch.transactions.map((tx) =>
				reject
					? { transactionId: tx.id, error: "rejected" }
					: { transactionId: tx.id, syncId: ++this.syncId },
			),
		};
	}

	subscribe(listener: DeltaListener) {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	emit(actions: Parameters<DeltaListener>[0]["actions"]) {
		for (const listener of this.listeners) {
			listener({ actions });
		}
	}
}

describe("SyncClient", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("bootstraps, batches a tick of edits, sends once, and completes on echo", async () => {
		const transport = new FakeTransport();
		const { store, sync } = createOutline({ transport });
		await sync.start();
		expect(sync.status).toBe("ready");
		expect(transport.bootstrap).toHaveBeenCalledOnce();

		const a = store.create();
		store.setCollapsed(a, true);
		expect(sync.pendingCount).toBe(2);
		await flushMicrotasks();

		expect(transport.sent).toHaveLength(1);
		expect(transport.sent[0]?.transactions.map((tx) => tx.kind)).toEqual([
			"create",
			"update",
		]);
		expect(sync.queue.awaitingSync.size).toBe(2);

		transport.emit([
			{
				id: 1,
				model: "node",
				modelId: a,
				action: "I",
				data: store.get(a)?.toData() as never,
			},
			{
				id: 2,
				model: "node",
				modelId: a,
				action: "U",
				data: { collapsed: true },
			},
		]);
		expect(sync.pendingCount).toBe(0);
		expect(sync.lastSyncId).toBe(2);
		expect(sync.queue.completed).toHaveLength(2);
	});

	it("keeps local in-flight edits on top of remote updates (rebase)", async () => {
		const transport = new FakeTransport();
		const { store, sync } = createOutline({ transport });
		await sync.start();

		const a = store.create();
		await flushMicrotasks();
		store.setCollapsed(a, true);

		transport.emit([
			{
				id: 1,
				model: "node",
				modelId: a,
				action: "U",
				data: { collapsed: false },
			},
		]);
		expect(store.get(a)?.collapsed).toBe(true);
	});

	it("reverts rejected transactions", async () => {
		const transport = new FakeTransport();
		const { store, sync } = createOutline({ transport });
		await sync.start();

		const a = store.create();
		await flushMicrotasks();
		transport.rejectNext = true;
		store.setCollapsed(a, true);
		await flushMicrotasks();

		expect(store.get(a)?.collapsed).toBe(false);
		expect(sync.queue.failed).toHaveLength(1);
		expect(sync.lastError).toBe("rejected");
	});

	it("goes offline on transport failure, requeues, and retries", async () => {
		vi.useFakeTimers();
		const transport = new FakeTransport();
		const { store, sync } = createOutline({ transport, retryDelayMs: 100 });
		await sync.start();

		transport.failNext = true;
		store.create();
		await vi.advanceTimersByTimeAsync(0);

		expect(sync.status).toBe("offline");
		expect(sync.queue.queued).toHaveLength(1);
		expect(transport.sent).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(100);
		expect(transport.delta).toHaveBeenCalledOnce();
		expect(sync.status).toBe("ready");
		expect(transport.sent).toHaveLength(1);
		expect(sync.queue.queued).toHaveLength(0);
	});

	it("edits made before start survive bootstrap", async () => {
		const transport = new FakeTransport();
		const { store, sync } = createOutline({ transport });
		const a = store.create();
		await sync.start();
		await flushMicrotasks();

		expect(store.get(a)).toBeDefined();
		expect(transport.sent).toHaveLength(1);
	});

	it("stop unsubscribes and ignores a stale bootstrap", async () => {
		const transport = new FakeTransport();
		const { sync } = createOutline({ transport });
		const started = sync.start();
		sync.stop();
		await started;
		expect(sync.status).toBe("idle");
		expect(transport.listeners.size).toBe(0);
	});

	it("round-trips through the console transport", async () => {
		const { store, sync } = createOutline({
			transport: new ConsoleSyncTransport(),
		});
		await sync.start();
		const a = store.create();
		store.setCollapsed(a, true);
		await flushMicrotasks(10);

		expect(sync.pendingCount).toBe(0);
		expect(sync.lastSyncId).toBe(2);
		expect(store.get(a)?.collapsed).toBe(true);
		expect(console.log).toHaveBeenCalledWith(
			"[cascade/sync]",
			"→ send",
			expect.objectContaining({ transactions: expect.any(Array) }),
		);
	});
});
