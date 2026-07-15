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
 * Resolves which rows an active filter set hides. Only rows that themselves
 * match stay visible; their ancestors and descendants are hidden too, same as
 * any other non-matching row. Rows stay in the array at their original depth
 * regardless, so indent, outdent, and drag-and-drop keep operating on the
 * same contiguous rows they always have; only rendering treats hidden rows
 * differently.
 */
export function getRowVisibility(
	rows: VisibleNodeRow[],
	filters: NodeFilters,
): RowVisibility {
	if (!filters.dueToday) return emptyVisibility;

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

	const hiddenIds = new Set(
		rows.filter((row) => !matchIds.has(row.id)).map((row) => row.id),
	);

	return { hiddenIds };
}
