import type { VisibleNodeRow } from "../../nodes/model/node-types";

/**
 * Row ids that focus mode should dim: every row except the node currently
 * being edited and its ancestor chain, which stay at full opacity so the
 * writer keeps their place in the outline.
 */
export function getFocusDimmedRowIds(
	rows: VisibleNodeRow[],
	editingNodeId: string | null,
): Set<string> {
	if (editingNodeId === null) return new Set();

	const parentById = new Map(rows.map((row) => [row.id, row.parentId]));
	const keepVisible = new Set<string>([editingNodeId]);
	let parentId = parentById.get(editingNodeId) ?? null;
	while (parentId !== null && !keepVisible.has(parentId)) {
		keepVisible.add(parentId);
		parentId = parentById.get(parentId) ?? null;
	}

	const dimmed = new Set<string>();
	for (const row of rows) {
		if (!keepVisible.has(row.id)) dimmed.add(row.id);
	}
	return dimmed;
}
