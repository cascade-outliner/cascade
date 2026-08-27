import type { OutlinePersistence, OutlineSnapshot } from "./types.ts";

/**
 * Keeps the snapshot in a variable. The default adapter: it makes the store
 * work everywhere - SSR, tests, a browser with storage disabled - without the
 * caller choosing anything, and it is what every other adapter is measured
 * against.
 */
export function createMemoryPersistence(
	initial: OutlineSnapshot | null = null,
): OutlinePersistence {
	let snapshot = initial;

	return {
		load: async () => snapshot,
		save: async (next) => {
			snapshot = next;
		},
	};
}
