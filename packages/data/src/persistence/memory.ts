import type { OutlinePersistence, OutlineSnapshot } from "../types.ts";

/**
 * Keeps the snapshot in a variable and nothing else. Used on the server, where
 * there is no IndexedDB and nothing to persist across a request, and in tests
 * that care about what the store writes rather than where it lands.
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
