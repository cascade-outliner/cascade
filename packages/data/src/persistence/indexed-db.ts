import type { Node } from "../types.ts";
import type { OutlinePersistence, OutlineSnapshot } from "./types.ts";

const DATABASE_NAME = "cascade-outline";
const NODE_STORE = "nodes";
const SCHEMA_VERSION = 1;

export interface IndexedDbPersistenceOptions {
	/**
	 * Which database to open. One outline per name: pass a per-user name to
	 * keep two accounts on the same browser from reading each other's nodes.
	 */
	databaseName?: string;
	/** The `IDBFactory` to open through. Defaults to the ambient one; tests pass their own. */
	factory?: IDBFactory;
}

/**
 * Whether this environment can back an IndexedDB adapter. False during SSR and
 * in browsers where storage is switched off, which is why the store takes its
 * adapter as an argument instead of importing one.
 */
export function isIndexedDbAvailable(
	factory: IDBFactory | undefined = globalThis.indexedDB,
): boolean {
	return Boolean(factory);
}

/**
 * Persists the outline to IndexedDB, one record per node, keyed by id.
 *
 * A node per record rather than one blob because writes are incremental: the
 * store hands over the whole outline on every save, and this adapter forwards
 * only the nodes whose `updatedAt` differs from what it last committed, plus
 * deletions for ids that vanished. Typing in one node therefore rewrites one
 * record, not the entire document.
 *
 * That bookkeeping assumes this adapter is the only writer to the database. A
 * second tab editing the same outline will drift: reconciling that is the sync
 * layer's job, not this one's.
 */
export function createIndexedDbPersistence(
	options: IndexedDbPersistenceOptions = {},
): OutlinePersistence {
	return new IndexedDbPersistence(options);
}

class IndexedDbPersistence implements OutlinePersistence {
	readonly #databaseName: string;
	readonly #factory: IDBFactory | undefined;
	#connection: Promise<IDBDatabase> | null = null;
	/** id -> the `updatedAt` of the record this adapter last committed for it. */
	#committed = new Map<string, number>();
	/** Whether `#committed` has been reconciled against what is actually on disk. */
	#reconciled = false;

	constructor({
		databaseName = DATABASE_NAME,
		factory,
	}: IndexedDbPersistenceOptions) {
		this.#databaseName = databaseName;
		this.#factory = factory ?? globalThis.indexedDB;
	}

	async load(): Promise<OutlineSnapshot | null> {
		const database = await this.#connect();
		const transaction = database.transaction(NODE_STORE, "readonly");
		const nodes = await requestResult<Node[]>(
			transaction.objectStore(NODE_STORE).getAll(),
		);

		this.#committed = new Map(nodes.map((node) => [node.id, node.updatedAt]));
		this.#reconciled = true;

		// No records is "never saved", not "saved an empty outline": the store
		// always persists at least its root node.
		return nodes.length > 0 ? { nodes } : null;
	}

	async save(snapshot: OutlineSnapshot): Promise<void> {
		const database = await this.#connect();
		await this.#reconcile(database);

		const written = snapshot.nodes.filter(
			(node) => this.#committed.get(node.id) !== node.updatedAt,
		);
		const live = new Set(snapshot.nodes.map((node) => node.id));
		const removed = [...this.#committed.keys()].filter((id) => !live.has(id));
		if (written.length === 0 && removed.length === 0) {
			return;
		}

		const transaction = database.transaction(NODE_STORE, "readwrite");
		const store = transaction.objectStore(NODE_STORE);
		for (const node of written) {
			store.put(node);
		}
		for (const id of removed) {
			store.delete(id);
		}
		await transactionDone(transaction);

		// Only after the transaction commits, so a failed save is retried by the
		// next one rather than being remembered as written.
		for (const node of written) {
			this.#committed.set(node.id, node.updatedAt);
		}
		for (const id of removed) {
			this.#committed.delete(id);
		}
	}

	/**
	 * Teach `#committed` about records already on disk when saving without a
	 * preceding `load`. They are recorded as stale (`NaN` matches no
	 * `updatedAt`), so the first save overwrites what it still has and deletes
	 * what it does not.
	 */
	async #reconcile(database: IDBDatabase): Promise<void> {
		if (this.#reconciled) {
			return;
		}
		const transaction = database.transaction(NODE_STORE, "readonly");
		const keys = await requestResult<IDBValidKey[]>(
			transaction.objectStore(NODE_STORE).getAllKeys(),
		);
		for (const key of keys) {
			this.#committed.set(String(key), Number.NaN);
		}
		this.#reconciled = true;
	}

	#connect(): Promise<IDBDatabase> {
		this.#connection ??= this.#open();
		return this.#connection;
	}

	async #open(): Promise<IDBDatabase> {
		try {
			if (!this.#factory) {
				throw new Error("IndexedDB is unavailable in this environment");
			}
			const database = await openDatabase(this.#factory, this.#databaseName);
			// Another tab is upgrading the schema: let go of the connection so its
			// upgrade is not blocked, and reopen (and re-reconcile) on next use.
			database.onversionchange = () => {
				database.close();
				this.#connection = null;
				this.#reconciled = false;
			};
			return database;
		} catch (error) {
			this.#connection = null;
			throw error;
		}
	}
}

function openDatabase(
	factory: IDBFactory,
	databaseName: string,
): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = factory.open(databaseName, SCHEMA_VERSION);
		let settled = false;

		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(NODE_STORE)) {
				request.result.createObjectStore(NODE_STORE, { keyPath: "id" });
			}
		};
		request.onsuccess = () => {
			if (settled) {
				// Rejected as blocked, then opened anyway: nothing will close it.
				request.result.close();
				return;
			}
			settled = true;
			resolve(request.result);
		};
		request.onerror = () => {
			settled = true;
			reject(request.error ?? new Error(`Could not open ${databaseName}`));
		};
		// An older connection in another tab is holding the upgrade up. Fail now
		// rather than hang the caller; the next call retries.
		request.onblocked = () => {
			settled = true;
			reject(new Error(`Opening ${databaseName} is blocked by another tab`));
		};
	});
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error ?? new Error("IndexedDB request failed"));
	});
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		const fail = () =>
			reject(transaction.error ?? new Error("IndexedDB transaction failed"));
		transaction.onerror = fail;
		transaction.onabort = fail;
	});
}
