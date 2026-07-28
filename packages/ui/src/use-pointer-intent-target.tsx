import { useCallback, useRef } from "react";
import { usePointerIntentContext } from "./pointer-intent-context";

export interface UsePointerIntentTargetOptions {
	id: string;
	/** false for obstacles (e.g. a drag handle) that should never be a redirect target. Defaults to true. */
	activatable?: boolean;
}

/**
 * Registers an element as a candidate for the nearest ancestor
 * `usePointerIntentScope`. Returns a callback ref (not an object ref) so
 * registration follows the exact mount/unmount of the underlying element,
 * including conditional element swaps in the caller's render.
 *
 * A no-op outside any scope (`usePointerIntentContext()` is null).
 */
export function usePointerIntentTarget({
	id,
	activatable = true,
}: UsePointerIntentTargetOptions): (node: HTMLElement | null) => void {
	const scope = usePointerIntentContext();
	const unregisterRef = useRef<(() => void) | null>(null);

	return useCallback(
		(node: HTMLElement | null) => {
			unregisterRef.current?.();
			unregisterRef.current = null;
			if (scope && node) {
				unregisterRef.current = scope.register({
					id,
					element: node,
					activatable,
				});
			}
		},
		[scope, id, activatable],
	);
}
