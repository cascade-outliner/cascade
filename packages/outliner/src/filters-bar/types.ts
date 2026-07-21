import type { NodeFilters } from "../node-filters";

export interface FiltersBarProps {
	filters: NodeFilters;
	onFiltersChange: (filters: NodeFilters) => void;
}
