import { dueBucket } from "../due-date-bucket";
import type { NodeFilters } from "../node-filters";
import type { VisibleNodeRow } from "../node-types";

export interface RowVisibility {
	/** Row ids to hide entirely: not themselves a filter match. */
	hiddenIds: Set<string>;
}

const emptyVisibility: RowVisibility = {
	hiddenIds: new Set(),
};

/** Whether a row itself satisfies the "due today" filter. */
export function isDueTodayMatch(row: VisibleNodeRow): boolean {
	if (!row.dueDate) return false;
	const completed = row.type === "task" && (row.metadata?.completed ?? false);
	return dueBucket(new Date(row.dueDate), completed) === "today";
}

/**
 * Resolves which rows an active filter set hides. A row stays visible if it
 * itself matches, or if the user has manually expanded their way down to it
 * (e.g. opening a "due today" match's real children to browse them) - same
 * as ordinary expand/collapse semantics for that subtree. Everything else is
 * hidden. Rows stay in the array at their original depth regardless, so
 * indent, outdent, and drag-and-drop keep operating on the same contiguous
 * rows they always have; only rendering treats hidden rows differently.
 */
export function getRowVisibility(
	rows: VisibleNodeRow[],
	filters: NodeFilters,
): RowVisibility {
	if (!filters.dueToday) return emptyVisibility;

	const byId = new Map(rows.map((row) => [row.id, row]));
	const matchIds = new Set(rows.filter(isDueTodayMatch).map((row) => row.id));

	const visibleCache = new Map<string, boolean>();
	const isVisible = (id: string): boolean => {
		if (matchIds.has(id)) return true;
		const cached = visibleCache.get(id);
		if (cached !== undefined) return cached;
		visibleCache.set(id, false); // guards against a cycle while resolving
		const parentId = byId.get(id)?.parentId ?? null;
		const parent = parentId !== null ? byId.get(parentId) : undefined;
		const result = !!parent?.expanded && isVisible(parentId as string);
		visibleCache.set(id, result);
		return result;
	};

	const hiddenIds = new Set(
		rows.filter((row) => !isVisible(row.id)).map((row) => row.id),
	);

	return { hiddenIds };
}

/**
 * Expand-under-filter: rows already present in `rows` may include matches
 * that live anywhere in `id`'s subtree (found independently of collapse
 * state - see visibleTree's `filter` param), sitting at whatever depth their
 * own path puts them at. A naive depth-range splice (as ordinary expandNode
 * does) would treat those already-present rows as part of the range it's
 * replacing and silently drop them. Instead, only add rows from the freshly
 * fetched subtree that aren't already in the array; leave everything else -
 * matches and any of their own already-loaded descendants - untouched.
 */
export function insertMissingSubtreeRows(
	rows: VisibleNodeRow[],
	id: string,
	subtree: VisibleNodeRow[],
): VisibleNodeRow[] {
	const nodeIndex = rows.findIndex((row) => row.id === id);
	if (nodeIndex === -1) return rows;
	const node = rows[nodeIndex];

	const existingIds = new Set(rows.map((row) => row.id));
	const missing = subtree
		.filter((row) => !existingIds.has(row.id))
		.map((row) => ({ ...row, depth: row.depth + node.depth + 1 }));

	const patchedNode = {
		...node,
		expanded: true,
		hasChildren: node.hasChildren || missing.length > 0,
	};
	if (missing.length === 0) {
		return rows.map((row) => (row.id === id ? patchedNode : row));
	}
	return [
		...rows.slice(0, nodeIndex).concat(patchedNode),
		...missing,
		...rows.slice(nodeIndex + 1),
	];
}

/**
 * Collapse-under-filter: removes only the non-matching descendants of `id` -
 * anything still due today stays visible regardless (that's the whole point
 * of the filter), while rows only shown because the user opened `id` to
 * browse them go away again. Recurses through every level, including under
 * matches, so a deeper manual expansion collapses along with its ancestor.
 */
export function removeNonMatchDescendants(
	rows: VisibleNodeRow[],
	id: string,
): VisibleNodeRow[] {
	const childrenByParent = new Map<string, VisibleNodeRow[]>();
	for (const row of rows) {
		if (row.parentId === null) continue;
		const list = childrenByParent.get(row.parentId);
		if (list) list.push(row);
		else childrenByParent.set(row.parentId, [row]);
	}

	const toRemove = new Set<string>();
	const stack = [id];
	while (stack.length > 0) {
		// biome-ignore lint/style/noNonNullAssertion: loop condition guarantees an element
		const current = stack.pop()!;
		for (const child of childrenByParent.get(current) ?? []) {
			if (!isDueTodayMatch(child)) toRemove.add(child.id);
			stack.push(child.id);
		}
	}

	return rows
		.filter((row) => !toRemove.has(row.id))
		.map((row) => (row.id === id ? { ...row, expanded: false } : row));
}
