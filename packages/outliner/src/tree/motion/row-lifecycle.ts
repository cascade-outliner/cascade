import {
	animateRowExit,
	outlineRowDropConfirmation,
} from "@cascade/ui/motion-row-lifecycle";

export type RowEntryMotion = "enter" | "flash";

// Module-level, client-only state (same pattern as `row-motion-flag.ts` and
// the web app's `undo-store.ts`): a mutation hook sets a marker/registers an
// element right before a row is inserted/removed, and `VirtualTreeRow`
// consumes it once, from its own mount effect or the delete flow below.
const pendingEntryMotion = new Map<string, RowEntryMotion>();
const mountedRowElements = new Map<string, HTMLElement>();

/** Call right before a newly created/duplicated row is inserted, so its first mount plays a rise-and-fade entrance. */
export function markRowEntering(id: string): void {
	pendingEntryMotion.set(id, "enter");
}

/** Call right before an undo/redo-restored row is inserted, so its first mount flashes instead of rising in. */
export function markRowRestored(id: string): void {
	pendingEntryMotion.set(id, "flash");
}

/** Consumed once by `VirtualTreeRow`'s mount effect, clearing the marker so later remounts/reorders never replay it. */
export function consumeEntryMotion(id: string): RowEntryMotion | undefined {
	const motion = pendingEntryMotion.get(id);
	if (motion) pendingEntryMotion.delete(id);
	return motion;
}

/** `VirtualTreeRow` registers its own element here on mount/update and clears it (passing `null`) on unmount. */
export function registerRowElement(
	id: string,
	element: HTMLElement | null,
): void {
	if (element) mountedRowElements.set(id, element);
	else mountedRowElements.delete(id);
}

/**
 * Plays the single-row exit animation for `id` if it's currently mounted,
 * and resolves once it finishes — or immediately if the row isn't mounted
 * (e.g. virtualized out of view), since there's nothing to animate. Callers
 * await this before actually removing the row from the tree data, so the
 * fade has something to animate instead of an instant unmount.
 */
export async function playRowExit(id: string): Promise<void> {
	const element = mountedRowElements.get(id);
	if (!element) return;
	const animation = animateRowExit(element);
	if (!animation) return;
	try {
		await animation.finished;
	} catch {
		// Cancelled (e.g. a second delete lands before the first finishes) — proceed with removal regardless.
	}
}

/** Outlines a mounted row once after a semantic conversion fully succeeds. */
export function acknowledgeMountedRowConversion(id: string): void {
	const element = mountedRowElements.get(id);
	if (element) outlineRowDropConfirmation(element);
}

/** Test-only: clears transient state so specs don't leak across cases. */
export function resetRowLifecycleMotion(): void {
	pendingEntryMotion.clear();
	mountedRowElements.clear();
}
