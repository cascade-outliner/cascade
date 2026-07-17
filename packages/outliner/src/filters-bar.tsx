import { Menu } from "@base-ui/react";
import { cva } from "@cascade/ui/cva.config";
import {
	CalendarIcon,
	CheckIcon,
	CheckSquareIcon,
	FunnelIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "./labels-context";
import { hasActiveFilters, type NodeFilters, noFilters } from "./node-filters";

interface FiltersBarProps {
	filters: NodeFilters;
	onFiltersChange: (filters: NodeFilters) => void;
}

const trigger = cva({
	base: [
		"inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium outline-none",
		"border-dark-grey/15 text-graphite hover:border-dark-grey/30 hover:text-dark-grey",
		"dark:border-ginger/15 dark:text-ginger/70 dark:hover:border-ginger/30 dark:hover:text-ginger",
		"data-popup-open:border-redleather/30 data-popup-open:bg-redleather/10 data-popup-open:text-redleather",
		"focus-visible:ring-2 focus-visible:ring-redleather/50",
	],
});

const popup = cva({
	base: [
		"w-56 rounded-lg border border-dark-grey/10 bg-white p-1 text-dark-grey",
		"shadow-lg shadow-dark-grey/15",
		"outline-none",
		"dark:border-ginger/10 dark:bg-dark-grey dark:text-ginger",
	],
});

const groupLabel = cva({
	base: "px-2.5 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-graphite/75 dark:text-ginger/50",
});

const menuItem = cva({
	base: [
		"flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none",
		"data-highlighted:bg-ginger/70 dark:data-highlighted:bg-ginger/20",
		"data-disabled:cursor-default data-disabled:opacity-50 data-disabled:hover:bg-transparent",
	],
});

const chip = cva({
	base: [
		"inline-flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1 text-[11.5px] font-medium tabular-nums",
		"border-peach/50 bg-peach/25 text-dark-grey dark:border-peach/40 dark:bg-peach/20 dark:text-ginger",
	],
});

/**
 * Entry point for outliner filters: a Filter menu grouped by field, active
 * filters rendered as removable chips, and a match count once something is
 * active. The due-date filters are mutually exclusive; "Hide completed"
 * stacks on top of either of them.
 */
export function FiltersBar({ filters, onFiltersChange }: FiltersBarProps) {
	const labels = useOutlinerLabels();
	const active = hasActiveFilters(filters);

	const dueDateFilters = [
		{
			key: "dueToday",
			label: labels.filtersDueToday,
			removeLabel: labels.filtersRemoveDueToday,
		},
		{
			key: "dueThisWeek",
			label: labels.filtersDueThisWeek,
			removeLabel: labels.filtersRemoveDueThisWeek,
		},
	] as const;

	return (
		<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-dark-grey/10 pb-3 dark:border-ginger/10">
			<div className="flex flex-wrap items-center gap-1.5">
				<Menu.Root>
					<Menu.Trigger className={trigger()}>
						<FunnelIcon size={12} weight="bold" />
						{labels.filtersTrigger}
					</Menu.Trigger>
					<Menu.Portal>
						<Menu.Positioner className="z-50 outline-none" sideOffset={6}>
							<Menu.Popup className={popup()}>
								<Menu.Group>
									<Menu.GroupLabel className={groupLabel()}>
										{labels.filtersDueDateGroup}
									</Menu.GroupLabel>
									{dueDateFilters.map((filter) => (
										<Menu.CheckboxItem
											key={filter.key}
											className={menuItem()}
											checked={filters[filter.key]}
											closeOnClick
											onCheckedChange={(checked) =>
												// Due-date filters are mutually exclusive: picking one
												// replaces whichever was active.
												onFiltersChange({
													...filters,
													dueToday: false,
													dueThisWeek: false,
													[filter.key]: checked,
												})
											}
										>
											<CalendarIcon size={13} weight="bold" />
											{filter.label}
											<Menu.CheckboxItemIndicator className="ml-auto">
												<CheckIcon size={13} weight="bold" />
											</Menu.CheckboxItemIndicator>
										</Menu.CheckboxItem>
									))}
								</Menu.Group>
								<Menu.Group>
									<Menu.GroupLabel className={groupLabel()}>
										{labels.filtersTasksGroup}
									</Menu.GroupLabel>
									<Menu.CheckboxItem
										className={menuItem()}
										checked={filters.hideCompleted}
										closeOnClick
										onCheckedChange={(checked) =>
											onFiltersChange({ ...filters, hideCompleted: checked })
										}
									>
										<CheckSquareIcon size={13} weight="bold" />
										{labels.filtersHideCompleted}
										<Menu.CheckboxItemIndicator className="ml-auto">
											<CheckIcon size={13} weight="bold" />
										</Menu.CheckboxItemIndicator>
									</Menu.CheckboxItem>
								</Menu.Group>
							</Menu.Popup>
						</Menu.Positioner>
					</Menu.Portal>
				</Menu.Root>

				{dueDateFilters.map(
					(filter) =>
						filters[filter.key] && (
							<span key={filter.key} className={chip()}>
								<CalendarIcon size={11} weight="bold" />
								{filter.label}
								<button
									type="button"
									aria-label={filter.removeLabel}
									className="flex size-4 items-center justify-center rounded-full outline-none hover:bg-dark-grey/10 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/15"
									onClick={() =>
										onFiltersChange({ ...filters, [filter.key]: false })
									}
								>
									<XIcon size={9} weight="bold" />
								</button>
							</span>
						),
				)}

				{filters.hideCompleted && (
					<span className={chip()}>
						<CheckSquareIcon size={11} weight="bold" />
						{labels.filtersHideCompleted}
						<button
							type="button"
							aria-label={labels.filtersRemoveHideCompleted}
							className="flex size-4 items-center justify-center rounded-full outline-none hover:bg-dark-grey/10 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/15"
							onClick={() =>
								onFiltersChange({ ...filters, hideCompleted: false })
							}
						>
							<XIcon size={9} weight="bold" />
						</button>
					</span>
				)}
			</div>

			{active && (
				<div className="flex items-center gap-3">
					<button
						type="button"
						className="cursor-pointer text-xs font-medium text-graphite underline decoration-dark-grey/25 underline-offset-2 hover:text-dark-grey hover:decoration-dark-grey/50 dark:text-ginger/60 dark:decoration-ginger/25 dark:hover:text-ginger dark:hover:decoration-ginger/50"
						onClick={() => onFiltersChange(noFilters)}
					>
						{labels.filtersClear}
					</button>
				</div>
			)}
		</div>
	);
}
