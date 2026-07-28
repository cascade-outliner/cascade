import type { TagSummary } from "../../nodes/model/node-tags";
import type { NodeFilters } from "./node-filters";

export interface FiltersBarProps {
	filters: NodeFilters;
	existingTags?: TagSummary[];
	onFiltersChange: (filters: NodeFilters) => void;
	completedFilterMode?: "hide" | "show";
}
