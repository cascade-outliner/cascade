import { type IDBPDatabase, openDB } from "idb";
import type { Node, OutlinePersistence } from "./types.ts";

const DB_NAME = "cascade";
const STORE = "nodes";
const DB_VERSION = 1;

export class IdbPersistence implements OutlinePersistence {
	readonly #db: Promise<IDBPDatabase | null>;

	constructor(name = DB_NAME) {
		this.#db = openDB(name, DB_VERSION, {
			upgrade(db) {
				db.createObjectStore(STORE, { keyPath: "id" });
			},
		}).catch((error) => {
			console.error(
				"IdbPersistence: cannot open database, running in memory",
				error,
			);

			return null;
		});
	}

	async load(): Promise<Node[]> {
		const db = await this.#db;

		return db ? db.getAll(STORE) : [];
	}

	async write(change: { put: Node[]; delete: string[] }): Promise<void> {
		const db = await this.#db;

		if (!db) {
			console.error(
				"IdbPersistence: cannot write to database, running in memory",
			);
			return;
		}

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
