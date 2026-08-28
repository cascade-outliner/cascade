import type { OutlinePersistence, OutlineSnapshot } from "../types.ts";

/** Long enough to swallow a burst of typing, short enough to survive a tab close. */
const DEFAULT_WAIT_MS = 250;

/**
 * Wraps another adapter so a burst of writes becomes one write. The store saves
 * a whole snapshot on every keystroke; without this, so does the disk.
 *
 * The window opens on the first save and is not extended by later ones, so a
 * continuously typing user still gets a write every `waitMs` instead of only
 * when they pause. Only the newest snapshot in a window is written - snapshots
 * are whole outlines, so an older one carries nothing the newer one lacks.
 */
export function coalescedPersistence(
	inner: OutlinePersistence,
	waitMs: number = DEFAULT_WAIT_MS,
): OutlinePersistence {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let pending: OutlineSnapshot | undefined;
	// Writes are chained rather than raced so snapshots reach the adapter in the
	// order the store produced them.
	let inFlight = Promise.resolve();

	function writePending(): Promise<void> {
		const snapshot = pending;
		pending = undefined;
		if (!snapshot) {
			return inFlight;
		}
		inFlight = inFlight.catch(() => {}).then(() => inner.save(snapshot));
		return inFlight;
	}

	return {
		load: () => inner.load(),

		save: async (snapshot) => {
			pending = snapshot;
			timer ??= setTimeout(() => {
				timer = undefined;
				// Swallowed here so a failed background write is not an unhandled
				// rejection; `flush` still surfaces failures to callers that wait.
				void writePending().catch(() => {});
			}, waitMs);
		},

		flush: async () => {
			if (timer !== undefined) {
				clearTimeout(timer);
				timer = undefined;
			}
			await writePending();
		},
	};
}
