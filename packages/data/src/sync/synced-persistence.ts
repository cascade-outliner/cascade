import type { Node } from "../outline/types.ts";
import type {
	OutlineChange,
	OutlinePersistence,
} from "../persistence/types.ts";
import type { OutboxEntry, SyncState } from "./types.ts";

/**
 * Wraps a local persistence so every write also lands in the sync outbox.
 *
 * The local write is awaited first: it is the source of truth and must be
 * durable whether or not the server is ever reached. `onWrite` lets the
 * engine schedule a push; changes the engine pulls from the server are
 * delivered to subscribers through `emit`, bypassing the outbox.
 */
export class SyncedPersistence implements OutlinePersistence {
	readonly inner: OutlinePersistence;
	readonly #state: SyncState;
	readonly #listeners = new Set<(change: OutlineChange) => void>();
	onWrite: (() => void) | null = null;

	constructor(inner: OutlinePersistence, state: SyncState) {
		this.inner = inner;
		this.#state = state;
	}

	load(): Promise<Node[]> {
		return this.inner.load();
	}

	get(id: string): Promise<Node | undefined> {
		return this.inner.get ? this.inner.get(id) : this.#find(id);
	}

	async write(change: OutlineChange): Promise<void> {
		await this.inner.write(change);
		const deletedAt = Date.now();
		const entries: OutboxEntry[] = [
			...change.put.map(
				(node): OutboxEntry => ({ id: node.id, kind: "put", node }),
			),
			...change.delete.map(
				(id): OutboxEntry => ({ id, kind: "delete", deletedAt }),
			),
		];
		try {
			await this.#state.enqueue(entries);
		} catch (error) {
			console.error("SyncedPersistence: enqueue failed", error);
			return;
		}
		this.onWrite?.();
	}

	subscribe(listener: (change: OutlineChange) => void): () => void {
		this.#listeners.add(listener);
		const unsubscribeInner = this.inner.subscribe?.(listener);
		return () => {
			this.#listeners.delete(listener);
			unsubscribeInner?.();
		};
	}

	/** Delivers a change made on the server to every subscriber. */
	emit(change: OutlineChange): void {
		for (const listener of this.#listeners) {
			listener(change);
		}
	}

	async #find(id: string): Promise<Node | undefined> {
		return (await this.inner.load()).find((node) => node.id === id);
	}
}
