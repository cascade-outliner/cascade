import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { noFilters } from "@cascade/outliner/node-filters";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { describe, expect, it } from "vitest";

/**
 * A straight chain of `length` rows, each the sole child of the previous,
 * with every non-leaf row collapsed. Mirrors a deeply nested outline where a
 * user collapsed each level on the way down: the descendant rows stay in the
 * flattened array (they're not refetched just because an ancestor collapsed)
 * so filtering still has to walk past them.
 */
function collapsedChain(length: number): VisibleNodeRow[] {
	const rows: VisibleNodeRow[] = [];
	for (let i = 0; i < length; i++) {
		const isLeaf = i === length - 1;
		rows.push({
			id: `n${i}`,
			parentId: i === 0 ? null : `n${i - 1}`,
			content: null,
			type: "text",
			metadata: null,
			expanded: false,
			order: String(i),
			dueDate: null,
			tags: [],
			depth: i,
			path: [String(i)],
			hasChildren: !isLeaf,
			isLastChild: true,
		});
	}
	return rows;
}

function timeGetRowVisibility(length: number): number {
	const rows = collapsedChain(length);
	// A tag filter (rather than hideCompleted alone) is what puts
	// getRowVisibility on the path that resolves collapsed descendants.
	const filters = { ...noFilters, tags: ["nonexistent"] };
	const start = performance.now();
	getRowVisibility(rows, filters);
	return performance.now() - start;
}

describe("getRowVisibility performance", () => {
	it("scales roughly linearly with a deeply nested, fully collapsed chain", () => {
		// Warm up the JIT so the comparison isn't dominated by first-run cost.
		timeGetRowVisibility(1_000);

		const small = timeGetRowVisibility(4_000);
		const large = timeGetRowVisibility(16_000); // 4x the rows

		// A linear pass takes roughly 4x as long for 4x the rows. A quadratic
		// blowup (each collapsed row re-scanning the rest of the chain to
		// find its subtree, instead of skipping rows already known hidden)
		// takes roughly 16x as long. 8x sits comfortably between the two and
		// tolerates timing noise; the 50ms floor absorbs noise when both runs
		// are already fast.
		expect(large).toBeLessThan(Math.max(small * 8, 50));
	});
});
