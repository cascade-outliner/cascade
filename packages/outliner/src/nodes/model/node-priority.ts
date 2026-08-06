/**
 * Task priority (#576). A fixed vocabulary rather than a user-defined one:
 * unlike statuses, the app needs to order and color these consistently, so
 * they live in code instead of a table. Applies to any node type — a plain
 * paragraph can be prioritized too, which is why it's a top-level column on
 * `nodes` rather than task-scoped `metadata`.
 */

/** Every priority level, most urgent first — also the UI's display order. */
export const PRIORITY_NAMES = ["urgent", "high", "medium", "low"] as const;

export type PriorityName = (typeof PRIORITY_NAMES)[number];

export function isPriorityName(value: unknown): value is PriorityName {
	return (PRIORITY_NAMES as readonly unknown[]).includes(value);
}
