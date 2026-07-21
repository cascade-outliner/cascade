import type { NodeFilters } from "../node-filters";
import type { TagSummary } from "../node-tags";

export interface FiltersBarProps {
	filters: NodeFilters;
	existingTags?: TagSummary[];
	onFiltersChange: (filters: NodeFilters) => void;
}
