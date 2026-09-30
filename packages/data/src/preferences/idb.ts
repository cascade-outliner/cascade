import type { IDBPDatabase } from "idb";
import {
	DB_NAME,
	openCascadeDb,
	PREFERENCES_STORE,
} from "../persistence/idb.ts";
import type { Preferences } from "./types.ts";

/** Preferences in the same IndexedDB database as the outline; changes reach other tabs. */
export class IdbPreferences implements Preferences {
	readonly #db: Promise<IDBPDatabase>;
	readonly #channel: BroadcastChannel;

	constructor(name = DB_NAME, db: Promise<IDBPDatabase> = openCascadeDb(name)) {
		this.#channel = new BroadcastChannel(`${name}:preferences`);
		this.#db = db;
	}

	async get(key: string): Promise<unknown> {
		const db = await this.#db;
		const row: { key: string; value: unknown } | undefined = await db.get(
			PREFERENCES_STORE,
			key,
		);
		return row?.value;
	}

	async set(key: string, value: unknown): Promise<void> {
		const db = await this.#db;
		await db.put(PREFERENCES_STORE, { key, value });
		this.#channel.postMessage(key);
	}

	async remove(key: string): Promise<void> {
		const db = await this.#db;
		await db.delete(PREFERENCES_STORE, key);
		this.#channel.postMessage(key);
	}

	subscribe(listener: (key: string) => void): () => void {
		const onMessage = (event: MessageEvent<string>) => listener(event.data);
		this.#channel.addEventListener("message", onMessage);
		return () => this.#channel.removeEventListener("message", onMessage);
	}
}
