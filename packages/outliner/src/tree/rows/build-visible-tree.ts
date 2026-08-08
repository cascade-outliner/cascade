import type { FlatNodeRow, VisibleNodeRow } from "../../nodes/model/node-types";

function compareOrder(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Groups an unordered node list by `parentId`, without sorting siblings yet.
 * `walkVisibleTree` sorts each sibling group lazily, the first time it's
 * actually visited — so building this index is a single cheap pass over
 * `rows` regardless of tree size, and the (more expensive, per-group)
 * sorting cost stays proportional to the subtree a walk actually visits
 * rather than the whole tree. Reuse one index across multiple walks (e.g.
 * switching which node is focused) so already-sorted groups aren't
 * re-sorted.
 */
export function buildChildrenIndex(rows: FlatNodeRow[]): ChildrenIndex {
	const byParent = new Map<string | null, FlatNodeRow[]>();
	for (const row of rows) {
		const siblings = byParent.get(row.parentId);
		if (siblings) siblings.push(row);
		else byParent.set(row.parentId, [row]);
	}
	return { byParent, sortedParents: new Set() };
}

export interface ChildrenIndex {
	byParent: Map<string | null, FlatNodeRow[]>;
	sortedParents: Set<string | null>;
}

function sortedChildrenOf(
	index: ChildrenIndex,
	parentId: string | null,
): FlatNodeRow[] {
	const children = index.byParent.get(parentId);
	if (!children) return [];
	if (!index.sortedParents.has(parentId)) {
		children.sort((a, b) => compareOrder(a.order, b.order));
		index.sortedParents.add(parentId);
	}
	return children;
}

/**
 * Walks a pre-built `ChildrenIndex` depth-first from `rootId`, producing the
 * flat visible-row list — the client-side counterpart to the server's old
 * recursive-CTE ordering. `rootId` scopes the walk to one node's subtree
 * (its own row is not included, matching `nodes.visibleTree`'s old
 * semantics); `includeCollapsed` ignores each row's `expanded` flag and
 * always descends, for callers that need every descendant regardless of
 * collapse state (e.g. a due-date filter reaching into a collapsed node).
 */
export function walkVisibleTree(
	index: ChildrenIndex,
	rootId: string | null,
	options: {
		includeCollapsed?: boolean;
		treatBoardsAsTrees?: boolean;
	} = {},
): VisibleNodeRow[] {
	const result: VisibleNodeRow[] = [];

	function walk(parentId: string | null, depth: number, parentPath: string[]) {
		const children = sortedChildrenOf(index, parentId);
		children.forEach((child, childIndex) => {
			const path = [...parentPath, child.order];
			const hasChildren = (index.byParent.get(child.id)?.length ?? 0) > 0;
			result.push({
				...child,
				depth,
				path,
				hasChildren,
				isLastChild: childIndex === children.length - 1,
			});
			// A board node's children render as embedded board cards (issue
			// #455 follow-up), not further tree rows — so a board encountered
			// mid-walk never flattens its own subtree here, regardless of its
			// `expanded`/`includeCollapsed` state. Walking it as the root
			// itself (its own detail page, or the embedded board's own card
			// list) is unaffected: this check only guards *its children's*
			// recursion, not the walk that starts at the board node itself.
			if (
				(!child.isBoard || options.treatBoardsAsTrees) &&
				(options.includeCollapsed || child.expanded)
			) {
				walk(child.id, depth + 1, path);
			}
		});
	}

	walk(rootId, 0, []);
	return result;
}

/**
 * Rebuilds the flat, depth-first visible-row list from an unordered node
 * list in one call. Prefer `buildChildrenIndex` + `walkVisibleTree` when
 * deriving rows for multiple `rootId`s off the same `rows` array (see
 * `useVisibleTree`), so switching which subtree is walked doesn't re-sort
 * sibling groups outside it.
 */
export function buildVisibleTree(
	rows: FlatNodeRow[],
	rootId: string | null,
	options: { includeCollapsed?: boolean } = {},
): VisibleNodeRow[] {
	return walkVisibleTree(buildChildrenIndex(rows), rootId, options);
}
