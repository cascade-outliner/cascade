import { allNodeCapabilities } from "../../features/model/node-capabilities";
import { useOutlinerLabels } from "../../i18n/outliner-labels-context";
import type { FiltersBarProps } from "../model/filters-bar.types";
import { hasActiveFilters, noFilters } from "../model/node-filters";
import { ActiveFilterChips } from "./active-filter-chips";
import { clearAll } from "./filters-bar.styles";
import { FiltersMenu } from "./filters-menu";

/** Filter controls and active-filter summary for an outliner view. */
export function FiltersBar({
	filters,
	existingTags = [],
	existingStatuses = [],
	onFiltersChange,
	completedFilterMode = "hide",
	capabilities = allNodeCapabilities,
}: FiltersBarProps) {
	const labels = useOutlinerLabels();
	const hasActiveViewFilters = hasActiveFilters({
		...filters,
		hideCompleted:
			completedFilterMode === "show"
				? !filters.hideCompleted
				: filters.hideCompleted,
	});

	return (
		<div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-canvas py-1 dark:border-surface/10 dark:bg-ink">
			<div className="flex flex-wrap items-center gap-1.5">
				<FiltersMenu
					filters={filters}
					existingTags={existingTags}
					existingStatuses={existingStatuses}
					onFiltersChange={onFiltersChange}
					completedFilterMode={completedFilterMode}
					capabilities={capabilities}
				/>
				<ActiveFilterChips
					filters={filters}
					existingStatuses={existingStatuses}
					onFiltersChange={onFiltersChange}
					completedFilterMode={completedFilterMode}
					capabilities={capabilities}
				/>
			</div>

			{hasActiveViewFilters && (
				<div className="flex items-center gap-3">
					<button
						type="button"
						className={clearAll()}
						onClick={() =>
							onFiltersChange({
								...noFilters,
								hideCompleted: completedFilterMode === "show",
							})
						}
					>
						{labels.filtersClear}
					</button>
				</div>
			)}
		</div>
	);
}
