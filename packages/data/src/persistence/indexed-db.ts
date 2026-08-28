import type { Node, OutlinePersistence, OutlineSnapshot } from "../types.ts";

const DATABASE_NAME = "cascade";
const STORE_NAME = "outline";
const SNAPSHOT_KEY = "default";
const DATABASE_VERSION = 1;

export interface IndexedDbPersistenceOptions {
	databaseName?: string;
	storeName?: string;
	/** Key the outline is stored under. One outline per key, one key for now. */
	snapshotKey?: string;
	/**
	 * The `IDBFactory` to open against. Defaults to the global one; injected by
	 * tests (`fake-indexeddb`) and by any host that provides its own.
	 */
	factory?: IDBFactory;
}

/** True when this environment can actually open a database (browser, not SSR). */
export function isIndexedDbAvailable(): boolean {
	// Accessing `indexedDB` throws rather than returning undefined in some
	// hardened/private-browsing configurations, so guard the read itself.
	try {
		return typeof globalThis.indexedDB !== "undefined";
	} catch {
		return false;
	}
}

/**
 * Stores the outline as a single record in one object store. A whole-snapshot
 * write is the right shape while the store hands us whole snapshots: one
 * transaction per save, no key bookkeeping, and a read is one `get`. Per-node
 * records only start paying off with a diffing writer above them, which is the
 * sync layer's job.
 *
 * The connection is opened lazily, so constructing this during SSR is inert -
 * nothing touches IndexedDB until the first `load` or `save`.
 */
export class IndexedDbPersistence implements OutlinePersistence {
	readonly #databaseName: string;
	readonly #storeName: string;
	readonly #snapshotKey: string;
	readonly #factory: IDBFactory | undefined;
	#connection: Promise<IDBDatabase> | undefined;

	constructor(options: IndexedDbPersistenceOptions = {}) {
		this.#databaseName = options.databaseName ?? DATABASE_NAME;
		this.#storeName = options.storeName ?? STORE_NAME;
		this.#snapshotKey = options.snapshotKey ?? SNAPSHOT_KEY;
		this.#factory = options.factory;
	}

	async load(): Promise<OutlineSnapshot | null> {
		const database = await this.#open();
		const transaction = database.transaction(this.#storeName, "readonly");
		const stored = await asPromise(
			transaction.objectStore(this.#storeName).get(this.#snapshotKey),
		);
		// A record written by an older build, or a half-written one, reads as
		// "nothing stored" rather than crashing the app on boot.
		return isSnapshot(stored) ? stored : null;
	}

	async save(snapshot: OutlineSnapshot): Promise<void> {
		const database = await this.#open();
		await new Promise<void>((resolve, reject) => {
			const transaction = database.transaction(this.#storeName, "readwrite");
			transaction.objectStore(this.#storeName).put(snapshot, this.#snapshotKey);
			// Resolve on the transaction, not the request: the write is only
			// durable once the transaction commits.
			transaction.oncomplete = () => resolve();
			transaction.onabort = () => reject(transaction.error ?? failed("save"));
			transaction.onerror = () => reject(transaction.error ?? failed("save"));
		});
	}

	/** Drop the connection. Another tab can then upgrade the schema. */
	close(): void {
		const connection = this.#connection;
		this.#connection = undefined;
		void connection?.then((database) => database.close()).catch(() => {});
	}

	#open(): Promise<IDBDatabase> {
		this.#connection ??= this.#connect().catch((error: unknown) => {
			// Never cache a failed open: the next write should get to retry.
			this.#connection = undefined;
			throw error;
		});
		return this.#connection;
	}

	async #connect(): Promise<IDBDatabase> {
		const factory = this.#factory ?? globalThis.indexedDB;
		if (!factory) {
			throw new Error("IndexedDB is not available in this environment");
		}

		const request = factory.open(this.#databaseName, DATABASE_VERSION);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(this.#storeName)) {
				// Out-of-line keys: the snapshot is one opaque value, not a row.
				request.result.createObjectStore(this.#storeName);
			}
		};

		const database = await asPromise(request);
		// A newer build in another tab needs every old connection closed before it
		// can upgrade. Hold one open and that tab hangs on `onblocked` forever.
		database.onversionchange = () => {
			this.#connection = undefined;
			database.close();
		};
		return database;
	}
}

/** Convenience factory, matching the other adapters. */
export function indexedDbPersistence(
	options: IndexedDbPersistenceOptions = {},
): IndexedDbPersistence {
	return new IndexedDbPersistence(options);
}

function asPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? failed("request"));
	});
}

function failed(what: string): Error {
	return new Error(`IndexedDB ${what} failed`);
}

/**
 * Shape check only. Tree integrity is not checked here: `OutlineStore` already
 * skips children it cannot find and tolerates a missing parent, so a snapshot
 * with dangling ids degrades to a smaller outline instead of a broken one.
 */
function isSnapshot(value: unknown): value is OutlineSnapshot {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const nodes = (value as { nodes?: unknown }).nodes;
	return Array.isArray(nodes) && nodes.every(isNode);
}

function isNode(value: unknown): value is Node {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const node = value as Record<string, unknown>;
	return (
		typeof node.id === "string" &&
		(typeof node.parentId === "string" || node.parentId === null) &&
		Array.isArray(node.childIds) &&
		node.childIds.every((childId) => typeof childId === "string") &&
		typeof node.content === "object" &&
		node.content !== null &&
		typeof node.collapsed === "boolean" &&
		typeof node.updatedAt === "number"
	);
}
