import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import type { Node } from "../outline/types.ts";

/**
 * Order keys longer than this are assumed to result from repeated inserts at
 * the same boundary, and are due for a rebalance.
 */
export const REBALANCE_THRESHOLD = 50;

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

/** Whether any of `orders` has grown long enough to warrant a rebalance. */
export function needsRebalance(orders: Iterable<string>): boolean {
	for (const order of orders) {
		if (order.length > REBALANCE_THRESHOLD) {
			return true;
		}
	}
	return false;
}

/** `count` short, evenly spaced order keys, for reassigning a whole sibling group. */
export function evenOrders(count: number): string[] {
	return generateNKeysBetween(undefined, undefined, count);
}
