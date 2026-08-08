import type { StatusSummary } from "../../nodes/model/node-statuses";
import type { TagSummary } from "../../nodes/model/node-tags";
import type { NodeFilters } from "./node-filters";

export interface FiltersBarProps {
	filters: NodeFilters;
	existingTags?: TagSummary[];
	/** All of this user's statuses, for the status filter submenu. */
	existingStatuses?: StatusSummary[];
	onFiltersChange: (filters: NodeFilters) => void;
	completedFilterMode?: "hide" | "show";
	capabilities?: ReadonlySet<NodeCapabilityId>;
}

import type { NodeCapabilityId } from "../../features/model/node-capabilities";
