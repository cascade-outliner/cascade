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
	const matchIds = new Set(
		rows
			.filter((row) => {
				if (!row.dueDate) return false;
				const completed =
					row.type === "task" && (row.metadata?.completed ?? false);
				return dueBucket(new Date(row.dueDate), completed) === "today";
			})
			.map((row) => row.id),
	);

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
