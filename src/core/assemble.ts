import type { CascadeUISlots, ResolvedCascadeConfig } from "./feature";

/** Merge ORPC procedure maps from all features into a single flat router object */
export function assembleRouter(
	config: ResolvedCascadeConfig,
): Record<string, unknown> {
	return Object.assign({}, ...config.features.map((f) => f.procedures ?? {}));
}

/**
 * Collect all components registered to a named UI slot across all features.
 * Returns an empty array if no feature contributes to the slot.
 */
export function assembleSlot<K extends keyof CascadeUISlots>(
	config: ResolvedCascadeConfig,
	slot: K,
): NonNullable<CascadeUISlots[K]> {
	return config.features.flatMap(
		(f) => (f.slots?.[slot] ?? []) as NonNullable<CascadeUISlots[K]>,
	) as NonNullable<CascadeUISlots[K]>;
}
