import { generateNKeysBetween } from "fractional-indexing";
import { textState } from "./content.ts";
import type { Node } from "./types.ts";

const FANOUT = 10;

/**
 * A deterministic, fully expanded outline of `count` nodes for benchmarks and
 * perf tests: every node has up to 10 children, so 100k nodes nest 5 deep.
 */
export function generateOutline(count: number): Node[] {
	const orders = generateNKeysBetween(null, null, FANOUT);
	return Array.from({ length: count }, (_, i) => ({
		id: `n${i}`,
		parentId: i < FANOUT ? null : `n${Math.floor(i / FANOUT) - 1}`,
		order: orders[i % FANOUT] as string,
		content: textState(`Node ${i}`),
		collapsed: false,
		updatedAt: 1,
	}));
}
