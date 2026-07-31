import type { FlatNodeRow, VisibleNodeRow } from "../../nodes/model/node-types";

function compareOrder(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Rebuilds the flat, depth-first visible-row list from an unordered node
 * list, grouping by `parentId` and sorting each sibling group by its
 * fractional-index `order` — the client-side counterpart to the server's
 * old recursive-CTE ordering. `rootId` scopes the walk to one node's
 * subtree (its own row is not included, matching `nodes.visibleTree`'s old
 * semantics); `includeCollapsed` ignores each row's `expanded` flag and
 * always descends, for callers that need every descendant regardless of
 * collapse state (e.g. a due-date filter reaching into a collapsed node).
 */
export function buildVisibleTree(
	rows: FlatNodeRow[],
	rootId: string | null,
	options: { includeCollapsed?: boolean } = {},
): VisibleNodeRow[] {
	const childrenByParent = new Map<string | null, FlatNodeRow[]>();
	for (const row of rows) {
		const siblings = childrenByParent.get(row.parentId);
		if (siblings) siblings.push(row);
		else childrenByParent.set(row.parentId, [row]);
	}
	for (const siblings of childrenByParent.values()) {
		siblings.sort((a, b) => compareOrder(a.order, b.order));
	}

	const result: VisibleNodeRow[] = [];

	function walk(parentId: string | null, depth: number, parentPath: string[]) {
		const children = childrenByParent.get(parentId) ?? [];
		children.forEach((child, index) => {
			const path = [...parentPath, child.order];
			const hasChildren = (childrenByParent.get(child.id)?.length ?? 0) > 0;
			result.push({
				...child,
				depth,
				path,
				hasChildren,
				isLastChild: index === children.length - 1,
			});
			if (options.includeCollapsed || child.expanded) {
				walk(child.id, depth + 1, path);
			}
		});
	}

	walk(rootId, 0, []);
	return result;
}
