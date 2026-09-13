import { generateKeyBetween } from "fractional-indexing";
import type { Node } from "../outline/types.ts";

/**
 * Sorts nodes by their fractional `order` key, ascending.
 *
 * Order keys compare as plain strings, so this is a `sort` comparator.
 */
export function byOrder(a: Node, b: Node): number {
	return a.order < b.order ? -1 : a.order > b.order ? 1 : 0;
}

/**
 * Returns an order key that sorts strictly between `prev` and `next`.
 *
 * Omit `prev` to place before everything, `next` to place after everything,
 * both for the first key of an empty list.
 */
export function orderBetween(prev?: string, next?: string): string {
	return generateKeyBetween(prev ?? null, next ?? null);
}
