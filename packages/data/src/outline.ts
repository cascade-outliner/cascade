import { OutlineStore } from "./store/outline-store.ts";
import { ConsoleSyncTransport } from "./sync/console-transport.ts";
import type { SyncTransport } from "./sync/protocol.ts";
import { SyncClient } from "./sync/sync-client.ts";
import { TransactionQueue } from "./sync/transaction-queue.ts";

export interface Outline {
	store: OutlineStore;
	sync: SyncClient;
}

export interface CreateOutlineOptions {
	transport?: SyncTransport;
	retryDelayMs?: number;
	maxRetryDelayMs?: number;
}

export function createOutline(options: CreateOutlineOptions = {}): Outline {
	const queue = new TransactionQueue();
	const store = new OutlineStore(queue);
	const sync = new SyncClient({
		store,
		queue,
		transport: options.transport ?? new ConsoleSyncTransport(),
		retryDelayMs: options.retryDelayMs,
		maxRetryDelayMs: options.maxRetryDelayMs,
	});
	return { store, sync };
}
