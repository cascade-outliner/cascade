import { type IDBPDatabase, openDB } from "idb";
import type { Node } from "../outline/types.ts";
import type { OutlinePersistence } from "./types.ts";

const DB_NAME = "cascade";
const STORE = "nodes";
const DB_VERSION = 1;

/** Persists the outline in IndexedDB. If the database can't be opened, `load` and `write` reject. */
export class IdbPersistence implements OutlinePersistence {
	readonly #db: Promise<IDBPDatabase>;

	constructor(name = DB_NAME) {
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

	async write(change: { put: Node[]; delete: string[] }): Promise<void> {
		const db = await this.#db;
		const tx = db.transaction(STORE, "readwrite");

		for (const node of change.put) {
			tx.store.put(node);
		}

		for (const id of change.delete) {
			tx.store.delete(id);
		}

		await tx.done;
	}
}
