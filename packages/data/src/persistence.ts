import type { OutlinePersistence, OutlineSnapshot } from "./types.ts";

const DATABASE_NAME = "cascade";
const DATABASE_VERSION = 1;
const STORE_NAME = "outline";
const SNAPSHOT_KEY = "default";

/**
 * Keeps the snapshot in a variable and nothing else. Used on the server, where
 * there is nothing to persist across a request, and in tests.
 */
export function memoryPersistence(
	initial: OutlineSnapshot | null = null,
): OutlinePersistence {
	let stored = initial;
	return {
		load: async () => stored,
		save: async (snapshot) => {
			stored = snapshot;
		},
	};
}

/**
 * Stores the outline as a single record in one object store. A whole-snapshot
 * write is the right shape while the store hands us whole snapshots: one
 * transaction per save, no key bookkeeping, and a read is one `get`. Per-node
 * records only start paying off with a diffing writer above them.
 *
 * The connection opens lazily, so constructing this during SSR is inert.
 * `factory` is here for tests (`fake-indexeddb`).
 */
export function indexedDbPersistence(
	factory: IDBFactory = globalThis.indexedDB,
): OutlinePersistence {
	let connection: Promise<IDBDatabase> | undefined;

	function open(): Promise<IDBDatabase> {
		connection ??= connect().catch((error: unknown) => {
			// Never cache a failed open: the next write should get to retry.
			connection = undefined;
			throw error;
		});
		return connection;
	}

	async function connect(): Promise<IDBDatabase> {
		const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
		request.onupgradeneeded = () => {
			// Out-of-line keys: the snapshot is one opaque value, not a row.
			request.result.createObjectStore(STORE_NAME);
		};
		const database = await asPromise(request);
		// A newer build in another tab cannot upgrade until every old connection
		// closes. Hold one open and that tab hangs.
		database.onversionchange = () => {
			connection = undefined;
			database.close();
		};
		return database;
	}

	return {
		load: async () => {
			const database = await open();
			const stored = await asPromise<unknown>(
				database
					.transaction(STORE_NAME, "readonly")
					.objectStore(STORE_NAME)
					.get(SNAPSHOT_KEY),
			);
			// Nothing stored yet, or a record from a shape we no longer read.
			return isSnapshot(stored) ? stored : null;
		},

		save: async (snapshot) => {
			const database = await open();
			await new Promise<void>((resolve, reject) => {
				const transaction = database.transaction(STORE_NAME, "readwrite");
				transaction.objectStore(STORE_NAME).put(snapshot, SNAPSHOT_KEY);
				// Resolve on the transaction, not the request: the write is only
				// durable once the transaction commits.
				transaction.oncomplete = () => resolve();
				transaction.onabort = () => reject(transaction.error);
				transaction.onerror = () => reject(transaction.error);
			});
		},
	};
}

/**
 * The default: IndexedDB in the browser, memory where it does not exist (SSR).
 *
 * The one place that picks an adapter. Everything downstream takes an
 * `OutlinePersistence`, so a different backend - a server, a file, a sync
 * engine - is a different call here and no change anywhere else.
 */
export function createOutlinePersistence(): OutlinePersistence {
	return typeof globalThis.indexedDB === "undefined"
		? memoryPersistence()
		: indexedDbPersistence();
}

function asPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

/** Shape check, not a repair pass: the store already tolerates dangling ids. */
function isSnapshot(value: unknown): value is OutlineSnapshot {
	const nodes = (value as { nodes?: unknown } | null)?.nodes;
	return (
		Array.isArray(nodes) && nodes.every((node) => typeof node?.id === "string")
	);
}
