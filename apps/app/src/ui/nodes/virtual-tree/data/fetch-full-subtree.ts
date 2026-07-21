import type { VisibleNodeRow } from "@cascade/outliner/node-types";
import { client } from "@/orpc/client";

/** Every visible descendant of `rootId`, walking `visibleTree`'s cursor pagination to completion. */
export async function fetchFullSubtree(
	rootId: string,
): Promise<VisibleNodeRow[]> {
	const rows: VisibleNodeRow[] = [];
	let cursor: string[] | null = null;
	do {
		const page = await client.nodes.visibleTree({ rootId, cursor });
		rows.push(...page.rows);
		cursor = page.nextCursor;
	} while (cursor !== null);
	return rows;
}
