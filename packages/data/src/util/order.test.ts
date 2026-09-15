import { describe, expect, it } from "vitest";
import {
	evenOrders,
	needsRebalance,
	orderBetween,
	REBALANCE_THRESHOLD,
} from "./order.ts";

describe("orderBetween", () => {
	it("sorts between the given bounds", () => {
		const first = orderBetween();
		const second = orderBetween(first);
		const middle = orderBetween(first, second);
		expect(first < middle).toBe(true);
		expect(middle < second).toBe(true);
	});
});

describe("needsRebalance", () => {
	it("is false for short keys", () => {
		expect(needsRebalance(["a0", "a1", "a2"])).toBe(false);
	});

	it("is true once a key exceeds the threshold", () => {
		expect(needsRebalance(["a0", "x".repeat(REBALANCE_THRESHOLD + 1)])).toBe(
			true,
		);
	});

	it("catches repeated bisection between the same fixed bounds", () => {
		const lower = orderBetween();
		let upper = orderBetween(lower);
		for (let i = 0; i < 500; i++) {
			upper = orderBetween(lower, upper);
		}
		expect(needsRebalance([upper])).toBe(true);
	});
});

describe("evenOrders", () => {
	it("returns the requested count of distinct, sorted, short keys", () => {
		const orders = evenOrders(20);
		expect(orders).toHaveLength(20);
		expect(new Set(orders).size).toBe(20);
		expect([...orders].sort()).toEqual(orders);
		for (const order of orders) {
			expect(order.length).toBeLessThanOrEqual(REBALANCE_THRESHOLD);
		}
	});

	it("returns an empty array for an empty group", () => {
		expect(evenOrders(0)).toEqual([]);
	});
});
