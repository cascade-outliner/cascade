import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import type { VisibleNodeRow } from "@cascade/outliner/node-types";

export type Shape = "wide" | "deep" | "balanced";

interface ShapeConfig {
	roots: number;
	maxDepth: number;
	minChildren: number;
	maxChildren: number;
}

// Same three shapes as apps/web-app/e2e-perf/seed.ts's shapeConfig, so `--shape`
// means the same thing across the whole perf harness.
export function shapeConfig(shape: Shape, count: number): ShapeConfig {
	switch (shape) {
		case "wide":
			return { roots: 1, maxDepth: 2, minChildren: count, maxChildren: count };
		case "deep":
			return { roots: 1, maxDepth: count, minChildren: 1, maxChildren: 1 };
		case "balanced": {
			const maxDepth = 6;
			const minChildren = 1;
			const maxChildren = 12;
			const avgBranching = (minChildren + maxChildren) / 2;
			let perRoot = 0;
			for (let d = 0; d < maxDepth; d++) perRoot += avgBranching ** d;
			const roots = Math.max(1, Math.round(count / perRoot));
			return { roots, maxDepth, minChildren, maxChildren };
		}
	}
}

/** Deterministic, dependency-free PRNG so `--seed` reproduces the same tree. */
function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export interface SyntheticTreeOptions {
	seed: number;
	/** Fraction of non-leaf rows that start collapsed rather than expanded. */
	collapsedFraction: number;
	/** Fraction of rows carrying the tag the tag-filter benchmark searches for. */
	taggedFraction: number;
	/** Fraction of rows due today, for the due-date-filter benchmark. */
	dueTodayFraction: number;
}

interface StackEntry {
	parentId: string | null;
	depth: number;
	/** Levels still to generate below this node. */
	remainingDepth: number;
}

/**
 * Builds a flattened, depth-first-ordered VisibleNodeRow[] the way the real
 * `visibleTree` query would, without a database: getRowVisibility only reads
 * structural fields (parentId, depth, expanded, hasChildren) plus
 * tags/dueDate, so a synthetic tree exercises the same code the real filter
 * runs without needing a server or seeded account (see filter-bench.ts).
 *
 * Iterative (an explicit stack, not recursion) so a "deep" shape's single
 * long chain doesn't blow the call stack; always pushing a node's children
 * and popping the most recently pushed entry keeps each subtree a
 * contiguous run in the output, mirroring buildTree in src/db/seed-tree.ts.
 */
export function buildSyntheticRows(
	shape: Shape,
	count: number,
	options: SyntheticTreeOptions,
): VisibleNodeRow[] {
	const { roots, maxDepth, minChildren, maxChildren } = shapeConfig(shape, count);
	const random = mulberry32(options.seed);
	const rows: VisibleNodeRow[] = [];
	const today = formatCalendarDate(new Date());
	let nextId = 0;

	function makeRow(entry: StackEntry): VisibleNodeRow {
		const hasChildren = entry.remainingDepth > 0;
		const row: VisibleNodeRow = {
			id: `n${nextId++}`,
			parentId: entry.parentId,
			content: null,
			type: "text",
			metadata: null,
			expanded: !hasChildren || random() >= options.collapsedFraction,
			order: String(nextId),
			dueDate: random() < options.dueTodayFraction ? today : null,
			tags: random() < options.taggedFraction ? ["benchmark"] : [],
			depth: entry.depth,
			path: [String(nextId)],
			hasChildren,
			// Not read by getRowVisibility; not worth tracking for a benchmark tree.
			isLastChild: false,
		};
		rows.push(row);
		return row;
	}

	const stack: StackEntry[] = [];
	for (let i = 0; i < roots; i++) {
		stack.push({ parentId: null, depth: 0, remainingDepth: maxDepth - 1 });
	}

	while (stack.length > 0) {
		// biome-ignore lint/style/noNonNullAssertion: stack.length > 0 guarantees pop() returns an entry
		const entry = stack.pop()!;
		const row = makeRow(entry);
		if (!row.hasChildren) continue;
		const childCount =
			minChildren + Math.floor(random() * (maxChildren - minChildren + 1));
		for (let i = 0; i < childCount; i++) {
			stack.push({
				parentId: row.id,
				depth: entry.depth + 1,
				remainingDepth: entry.remainingDepth - 1,
			});
		}
	}

	return rows;
}
