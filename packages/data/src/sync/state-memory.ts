import type { OutboxEntry, SyncMeta, SyncState } from "./types.ts";

export class MemorySyncState implements SyncState {
	meta: SyncMeta = { userId: null, cursor: null, onboarding: null };
	readonly outbox = new Map<string, OutboxEntry>();

	async getMeta(): Promise<SyncMeta> {
		return { ...this.meta };
	}

	async setMeta(meta: Partial<SyncMeta>): Promise<void> {
		this.meta = { ...this.meta, ...meta };
	}

	async enqueue(entries: OutboxEntry[]): Promise<void> {
		for (const entry of entries) {
			this.outbox.set(entry.id, entry);
		}
	}

	async peek(): Promise<OutboxEntry[]> {
		return [...this.outbox.values()];
	}

	async ack(entries: OutboxEntry[]): Promise<void> {
		for (const entry of entries) {
			if (this.outbox.get(entry.id) === entry) {
				this.outbox.delete(entry.id);
			}
		}
	}
}
