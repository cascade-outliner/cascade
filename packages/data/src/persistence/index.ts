import {
	createIndexedDbPersistence,
	type IndexedDbPersistenceOptions,
	isIndexedDbAvailable,
} from "./indexed-db.ts";
import { createMemoryPersistence } from "./memory.ts";
import type { OutlinePersistence } from "./types.ts";

export type { OutlinePersistence, OutlineSnapshot } from "./types.ts";
export type { IndexedDbPersistenceOptions };
export {
	createIndexedDbPersistence,
	createMemoryPersistence,
	isIndexedDbAvailable,
};

/**
 * The adapter to use when the caller has no opinion: IndexedDB in a browser,
 * memory everywhere else. The single place that decides, so route selection
 * through here rather than testing for `indexedDB` at each call site.
 */
export function createDefaultPersistence(
	options: IndexedDbPersistenceOptions = {},
): OutlinePersistence {
	return isIndexedDbAvailable(options.factory)
		? createIndexedDbPersistence(options)
		: createMemoryPersistence();
}
