import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { client } from "@/orpc/client";

/**
 * Every descendant of `rootId`, walking `visibleTree`'s cursor pagination to
 * completion. Defaults to visible (expanded) descendants only; pass
 * `includeCollapsedDescendants` to walk the entire subtree regardless of
 * collapse state, e.g. to snapshot it before a delete for undo.
 */
export async function fetchFullSubtree(
	rootId: string,
	options: { includeCollapsedDescendants?: boolean } = {},
): Promise<VisibleNodeRow[]> {
	const rows: VisibleNodeRow[] = [];
	let cursor: string[] | null = null;
	do {
		const page = await client.nodes.visibleTree({
			rootId,
			cursor,
			...(options.includeCollapsedDescendants
				? { includeCollapsedDescendants: true }
				: {}),
		});
		rows.push(...page.rows);
		cursor = page.nextCursor;
	} while (cursor !== null);
	return rows;
}
