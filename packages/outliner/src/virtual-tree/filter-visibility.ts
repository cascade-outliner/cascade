import { dueBucket } from "../due-date-bucket";
import type { NodeFilters } from "../node-filters";
import type { VisibleNodeRow } from "../node-types";
import { subtreeRange } from "./visible-rows";

export interface RowVisibility {
	/** Row ids to hide entirely: not a match, and not on the path to one. */
	hiddenIds: Set<string>;
	/** Row ids to keep visible but dimmed: a match's ancestors or descendants. */
	contextIds: Set<string>;
}

const emptyVisibility: RowVisibility = {
	hiddenIds: new Set(),
	contextIds: new Set(),
};

/**
 * Resolves which rows an active filter set hides. Matches, their full
 * ancestor chain, and their full descendant subtree stay in the array at
 * their original depth, so indent, outdent, and drag-and-drop keep
 * operating on the same contiguous rows they always have; only rendering
 * treats hidden/context rows differently.
 */
export function getRowVisibility(
	rows: VisibleNodeRow[],
	filters: NodeFilters,
): RowVisibility {
	if (!filters.dueToday) return emptyVisibility;

	const parentById = new Map(rows.map((row) => [row.id, row.parentId]));
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

	const contextIds = new Set<string>();
	for (const id of matchIds) {
		let parentId = parentById.get(id) ?? null;
		while (
			parentId !== null &&
			!matchIds.has(parentId) &&
			!contextIds.has(parentId)
		) {
			contextIds.add(parentId);
			parentId = parentById.get(parentId) ?? null;
		}

		// A matched node's own descendants stay visible too, even if they
		// don't individually match, so its subtree isn't cut off mid-tree.
		const range = subtreeRange(rows, id);
		if (range) {
			for (let i = range.start + 1; i < range.end; i++) {
				const descendantId = rows[i].id;
				if (!matchIds.has(descendantId)) contextIds.add(descendantId);
			}
		}
	}

	const hiddenIds = new Set(
		rows
			.filter((row) => !matchIds.has(row.id) && !contextIds.has(row.id))
			.map((row) => row.id),
	);

	return { hiddenIds, contextIds };
}
