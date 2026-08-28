import type { Node, OutlinePersistence, OutlineSnapshot } from "./types.ts";

const DEFAULT_DATABASE_NAME = "cascade";
/** Bump only when the object stores change shape; `onupgradeneeded` migrates. */
const DATABASE_VERSION = 1;
/** One record per node, keyed by `id` - the shape a future diffing sync layer wants. */
const NODE_STORE = "nodes";

export interface IndexedDbPersistenceOptions {
	/** Defaults to `cascade`. Separate names give separate outlines. */
	databaseName?: string;
	/** Defaults to `globalThis.indexedDB`. Injected by tests; absent on the server. */
	factory?: IDBFactory;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error ?? new Error("IndexedDB request failed"));
	});
}

/**
 * `OutlinePersistence` on top of IndexedDB: the whole outline as one record per
 * node, rewritten from the snapshot the store hands over.
 *
 * Writes start immediately and never queue more than one deep - a save made
 * while a write is in flight replaces the snapshot waiting behind it, since a
 * newer one supersedes it entirely. That self-throttles a burst of keystrokes
 * to whatever the database can absorb without a timer, and keeps the window
 * where an edit exists only in memory down to a single transaction. Nothing is
 * held back for an unload handler to write: a transaction opened while the page
 * is going away does not commit, so the only defence against a closing tab is
 * to have started already.
 *
 * Where IndexedDB does not exist at all - server rendering, mostly - every
 * method is a no-op and the store simply stays in memory. A database that
 * exists but refuses to open is a real failure and rejects; callers that can't
 * act on it (`OutlineStore.hydrate`, `OutlineStore`'s write-through) swallow it.
 */
export class IndexedDbPersistence implements OutlinePersistence {
	readonly #databaseName: string;
	readonly #factory: IDBFactory | undefined;

	#database: Promise<IDBDatabase | null> | undefined;
	/** Newest snapshot not yet written. Replaced, never queued behind. */
	#pending: OutlineSnapshot | undefined;
	/** The run of writes in flight, `undefined` when the queue is empty. */
	#writing: Promise<void> | undefined;

	constructor({
		databaseName = DEFAULT_DATABASE_NAME,
		factory = globalThis.indexedDB,
	}: IndexedDbPersistenceOptions = {}) {
		this.#databaseName = databaseName;
		this.#factory = factory;
	}

	/** `null` when nothing has been stored yet, so the store keeps its fresh state. */
	async load(): Promise<OutlineSnapshot | null> {
		const database = await this.#open();
		if (!database) {
			return null;
		}

		const nodes = await promisify<Node[]>(
			database
				.transaction(NODE_STORE, "readonly")
				.objectStore(NODE_STORE)
				.getAll(),
		);
		return nodes.length > 0 ? { nodes } : null;
	}

	/** Resolves once `snapshot` - or a newer one that replaced it - has landed. */
	save(snapshot: OutlineSnapshot): Promise<void> {
		this.#pending = snapshot;
		this.#writing ??= this.#drain();
		return this.#writing;
	}

	/** Wait for the queue to empty. */
	flush(): Promise<void> {
		return this.#writing ?? Promise.resolve();
	}

	/** Write queued snapshots until none is left, newest first and only ever the newest. */
	async #drain(): Promise<void> {
		try {
			while (this.#pending) {
				const snapshot = this.#pending;
				this.#pending = undefined;
				await this.#write(snapshot);
			}
		} finally {
			// A failed run leaves anything queued behind it for the next `save` to
			// pick up; the newest snapshot carries the whole outline either way.
			this.#writing = undefined;
		}
	}

	/** Put every node and drop the records the snapshot no longer names, in one transaction. */
	async #write(snapshot: OutlineSnapshot): Promise<void> {
		const database = await this.#open();
		if (!database) {
			return;
		}

		await new Promise<void>((resolve, reject) => {
			const transaction = database.transaction(NODE_STORE, "readwrite");
			transaction.oncomplete = () => resolve();
			transaction.onabort = () =>
				reject(transaction.error ?? new Error("IndexedDB write aborted"));
			transaction.onerror = () =>
				reject(transaction.error ?? new Error("IndexedDB write failed"));

			const store = transaction.objectStore(NODE_STORE);
			// Queued before the puts, so it sees the pre-write key set; the deletes
			// it schedules run after them and only touch ids that are gone from the
			// outline.
			const keys = store.getAllKeys();
			const kept = new Set(snapshot.nodes.map((node) => node.id));
			keys.onsuccess = () => {
				for (const key of keys.result) {
					if (!kept.has(String(key))) {
						store.delete(key);
					}
				}
			};

			for (const node of snapshot.nodes) {
				store.put(node);
			}
		});
	}

	/** Opened once and reused; a rejection is cached too, rather than retried on every keystroke. */
	#open(): Promise<IDBDatabase | null> {
		this.#database ??= this.#openDatabase();
		return this.#database;
	}

	#openDatabase(): Promise<IDBDatabase | null> {
		const factory = this.#factory;
		if (!factory) {
			return Promise.resolve(null);
		}

		return new Promise((resolve, reject) => {
			const request = factory.open(this.#databaseName, DATABASE_VERSION);
			request.onupgradeneeded = () => {
				const database = request.result;
				if (!database.objectStoreNames.contains(NODE_STORE)) {
					database.createObjectStore(NODE_STORE, { keyPath: "id" });
				}
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () =>
				reject(request.error ?? new Error("IndexedDB could not be opened"));
			// Another tab holds an older version open; it will close eventually,
			// but this session can't wait on it to start saving.
			request.onblocked = () =>
				reject(new Error("IndexedDB upgrade blocked by another tab"));
		});
	}
}
