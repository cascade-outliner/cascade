import type { OutlinePersistence } from "../types.ts";
import { coalescedPersistence } from "./coalesced.ts";
import {
	type IndexedDbPersistenceOptions,
	indexedDbPersistence,
	isIndexedDbAvailable,
} from "./indexed-db.ts";
import { memoryPersistence } from "./memory.ts";

export { coalescedPersistence } from "./coalesced.ts";
export {
	IndexedDbPersistence,
	type IndexedDbPersistenceOptions,
	indexedDbPersistence,
	isIndexedDbAvailable,
} from "./indexed-db.ts";
export { memoryPersistence } from "./memory.ts";

export interface OutlinePersistenceOptions extends IndexedDbPersistenceOptions {
	/** Coalescing window for writes, in ms. `0` writes every change straight through. */
	waitMs?: number;
}

/**
 * The default stack: IndexedDB behind a coalescing window, falling back to
 * memory where IndexedDB does not exist (SSR, and browsers that refuse it).
 *
 * This is the only place that picks an adapter. Everything downstream takes an
 * `OutlinePersistence`, so a different backend - a server, a file, a sync
 * engine - is a different call here and no change anywhere else.
 */
export function createOutlinePersistence(
	options: OutlinePersistenceOptions = {},
): OutlinePersistence {
	const { waitMs, ...adapterOptions } = options;
	const adapter = isIndexedDbAvailable()
		? indexedDbPersistence(adapterOptions)
		: memoryPersistence();
	return waitMs === 0 ? adapter : coalescedPersistence(adapter, waitMs);
}
