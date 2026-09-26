import { type IDBPDatabase, openDB } from "idb";
import type { Node } from "../outline/types.ts";
import type { OutlineChange, OutlinePersistence } from "./types.ts";

export const DB_NAME = "cascade";
export const NODES_STORE = "nodes";
export const OUTBOX_STORE = "outbox";
export const META_STORE = "meta";
const DB_VERSION = 2;

/** Opens (and upgrades) the shared IndexedDB database the outline and its sync state live in. */
export function openCascadeDb(name = DB_NAME): Promise<IDBPDatabase> {
	return openDB(name, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(NODES_STORE)) {
				db.createObjectStore(NODES_STORE, { keyPath: "id" });
			}
			if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
				db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
			}
			if (!db.objectStoreNames.contains(META_STORE)) {
				db.createObjectStore(META_STORE, { keyPath: "key" });
			}
		},
	});
}

/**
 * Persists the outline in IndexedDB. If the database can't be opened, `load` and `write` reject.
 *
 * Every committed write is broadcast to other instances on the same database,
 * so tabs see each other's edits.
 */
export class IdbPersistence implements OutlinePersistence {
	readonly #db: Promise<IDBPDatabase>;
	readonly #channel: BroadcastChannel;

	constructor(name = DB_NAME, db: Promise<IDBPDatabase> = openCascadeDb(name)) {
		this.#channel = new BroadcastChannel(`${name}:changes`);
		this.#db = db;
	}

	async load(): Promise<Node[]> {
		const db = await this.#db;

		return db.getAll(NODES_STORE);
	}

	async get(id: string): Promise<Node | undefined> {
		const db = await this.#db;

		return db.get(NODES_STORE, id);
	}

	async write(change: OutlineChange): Promise<void> {
		const db = await this.#db;
		const tx = db.transaction(NODES_STORE, "readwrite");

		for (const node of change.put) {
			tx.store.put(node);
		}

		for (const id of change.delete) {
			tx.store.delete(id);
		}

		await tx.done;
		this.#channel.postMessage(change);
	}

	subscribe(listener: (change: OutlineChange) => void): () => void {
		const onMessage = (event: MessageEvent<OutlineChange>) =>
			listener(event.data);
		this.#channel.addEventListener("message", onMessage);
		return () => this.#channel.removeEventListener("message", onMessage);
	}
}
