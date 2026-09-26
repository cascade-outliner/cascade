import { type IDBPDatabase, openDB } from "idb";
import type { Node } from "../outline/types.ts";
import type { OutlineChange, OutlinePersistence } from "./types.ts";

const DB_NAME = "cascade";
const STORE = "nodes";
const DB_VERSION = 1;

/**
 * Persists the outline in IndexedDB. If the database can't be opened, `load` and `write` reject.
 *
 * Every committed write is broadcast to other instances on the same database,
 * so tabs see each other's edits.
 */
export class IdbPersistence implements OutlinePersistence {
	readonly #db: Promise<IDBPDatabase>;
	readonly #channel: BroadcastChannel;

	constructor(name = DB_NAME) {
		this.#channel = new BroadcastChannel(`${name}:changes`);
		this.#db = openDB(name, DB_VERSION, {
			upgrade(db) {
				db.createObjectStore(STORE, { keyPath: "id" });
			},
		});
	}

	async load(): Promise<Node[]> {
		const db = await this.#db;

		return db.getAll(STORE);
	}

	async write(change: OutlineChange): Promise<void> {
		const db = await this.#db;
		const tx = db.transaction(STORE, "readwrite");

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
