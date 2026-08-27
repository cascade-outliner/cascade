import type { Node } from "../types.ts";

/** Everything the store knows, as plain structured-cloneable data. */
export interface OutlineSnapshot {
	nodes: Node[];
}

/**
 * The port `OutlineStore` persists through, and the only thing an adapter has
 * to implement. Adapters are injected at construction rather than imported by
 * the store, because the right one depends on where the store is running:
 * IndexedDB in the browser, memory during SSR and in tests, a server-backed
 * one later.
 *
 * The contract:
 *
 * - `load` returns `null` when the adapter holds nothing yet, so "empty
 *   outline" and "never saved" stay distinguishable. Rejecting means the
 *   backing store is unusable; the store suspends writes rather than risk
 *   overwriting data it failed to read.
 * - `save` receives the whole outline, already detached from the store's
 *   observables, and is free to keep it or diff it. The store never calls it
 *   concurrently: one save is in flight at a time and the newest snapshot
 *   wins, so an adapter needs no queueing of its own.
 */
export interface OutlinePersistence {
	load(): Promise<OutlineSnapshot | null>;
	save(snapshot: OutlineSnapshot): Promise<void>;
}
