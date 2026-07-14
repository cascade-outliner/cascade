import type { NodeFilters } from "@cascade/outliner/node-filters";
import { parseAsBoolean, useQueryStates } from "nuqs";

const filterParsers = {
	dueToday: parseAsBoolean.withDefault(false),
};

/** Outliner filter state, synced to the URL so a filtered view is shareable/bookmarkable. */
export function useNodeFilters(): [
	NodeFilters,
	(filters: NodeFilters) => void,
] {
	return useQueryStates(filterParsers);
}
