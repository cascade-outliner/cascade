import type { IDBPDatabase } from "idb";
import {
	DB_NAME,
	META_STORE,
	OUTBOX_STORE,
	openCascadeDb,
} from "../persistence/idb.ts";
import type { OutboxEntry, SyncMeta, SyncState } from "./types.ts";

type StoredEntry = OutboxEntry & { seq: string };

/** Sync state kept in the same IndexedDB database as the outline, so it survives reloads. */
export class IdbSyncState implements SyncState {
	readonly #db: Promise<IDBPDatabase>;
	#seq = 0;
	readonly #session = Date.now().toString(36);

	constructor(db: Promise<IDBPDatabase> = openCascadeDb(DB_NAME)) {
		this.#db = db;
	}

	async getMeta(): Promise<SyncMeta> {
		const db = await this.#db;
		const rows: { key: string; value: unknown }[] = await db.getAll(META_STORE);
		const meta: Record<string, unknown> = {
			userId: null,
			cursor: null,
			onboarding: null,
		};
		for (const row of rows) {
			if (row.key in meta) {
				meta[row.key] = row.value;
			}
		}
		return meta as unknown as SyncMeta;
	}

	async setMeta(meta: Partial<SyncMeta>): Promise<void> {
		const db = await this.#db;
		const tx = db.transaction(META_STORE, "readwrite");
		for (const [key, value] of Object.entries(meta)) {
			tx.store.put({ key, value });
		}
		await tx.done;
	}

	async enqueue(entries: OutboxEntry[]): Promise<void> {
		const db = await this.#db;
		const tx = db.transaction(OUTBOX_STORE, "readwrite");
		for (const entry of entries) {
			const stored: StoredEntry = {
				...entry,
				seq: `${this.#session}:${++this.#seq}`,
			};
			tx.store.put(stored);
		}
		await tx.done;
	}

	async peek(): Promise<OutboxEntry[]> {
		const db = await this.#db;
		return db.getAll(OUTBOX_STORE);
	}

	async ack(entries: OutboxEntry[]): Promise<void> {
		const db = await this.#db;
		const tx = db.transaction(OUTBOX_STORE, "readwrite");
		for (const entry of entries) {
			const current = (await tx.store.get(entry.id)) as StoredEntry | undefined;
			if (current && current.seq === (entry as StoredEntry).seq) {
				tx.store.delete(entry.id);
			}
		}
		await tx.done;
	}
}
