import { Menu } from "@base-ui/react";
import { CalendarRange } from "@cascade/ui/calendar-range";
import { cva } from "@cascade/ui/cva.config";
import {
	CalendarDotIcon,
	CalendarDotsIcon,
	CalendarIcon,
	CaretRightIcon,
	CheckIcon,
	CheckSquareIcon,
	FunnelIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { useState } from "react";
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

const calendarPopup = cva({
	base: [
		"rounded-lg border border-dark-grey/10 bg-white p-3 text-dark-grey",
		"shadow-lg shadow-dark-grey/15 outline-none",
		"dark:border-ginger/10 dark:bg-dark-grey dark:text-ginger",
	],
});

const chip = cva({
	base: [
		"inline-flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-1 text-[11.5px] font-medium tabular-nums",
		"border-peach/50 bg-peach/25 text-dark-grey dark:border-peach/40 dark:bg-peach/20 dark:text-ginger",
	],
});

// Same visual as the tag editor's option checkboxes, so toggles look the
// same wherever they appear.
const checkbox = cva({
	base: "flex size-4 shrink-0 items-center justify-center rounded border",
	variants: {
		checked: {
			true: "border-redleather bg-redleather text-super-ginger",
			false: "border-dark-grey/30 dark:border-ginger/30",
		},
	},
});

/**
 * Entry point for outliner filters: a Filter menu grouped by field, active
 * filters rendered as removable chips, and a match count once something is
 * active. The due-date filters are mutually exclusive; "Hide completed"
 * stacks on top of any of them.
 */
const dueOnDateFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
});
const dueOnDateWithYearFormatter = new Intl.DateTimeFormat(undefined, {
	day: "numeric",
	month: "short",
	year: "numeric",
});

function formatDueOnDate(date: Date): string {
	return date.getFullYear() === new Date().getFullYear()
		? dueOnDateFormatter.format(date)
		: dueOnDateWithYearFormatter.format(date);
}

function formatDueDateRange(start: Date, end: Date): string {
	const currentYear = new Date().getFullYear();
	const sameYear = start.getFullYear() === end.getFullYear();
	// Only show the year on the end date if both are in the same non-current year,
	// or if they span across years.
	const startStr =
		start.getFullYear() === currentYear
			? dueOnDateFormatter.format(start)
			: dueOnDateWithYearFormatter.format(start);
	const endInCurrentYear = end.getFullYear() === currentYear;
	const startAndEndSameYear = sameYear && start.getFullYear() === currentYear;
	const endStr =
		endInCurrentYear || startAndEndSameYear
			? dueOnDateFormatter.format(end)
			: dueOnDateWithYearFormatter.format(end);
	return `${startStr}–${endStr}`;
}

export function FiltersBar({ filters, onFiltersChange }: FiltersBarProps) {
	const labels = useOutlinerLabels();
	const active = hasActiveFilters(filters);
	// Controlled so picking a calendar date can close the menu; plain buttons
	// inside the popup don't close it the way Menu.CheckboxItem does.
	const [menuOpen, setMenuOpen] = useState(false);

	const dueDateFilters = [
		{
			key: "dueToday",
			label: labels.filtersDueToday,
			removeLabel: labels.filtersRemoveDueToday,
			icon: CalendarDotIcon,
		},
		{
			key: "dueThisWeek",
			label: labels.filtersDueThisWeek,
			removeLabel: labels.filtersRemoveDueThisWeek,
			icon: CalendarDotsIcon,
		},
	] as const;

	return (
		<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-dark-grey/10 pb-3 dark:border-ginger/10">
			<div className="flex flex-wrap items-center gap-1.5">
				<Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
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
												onFiltersChange({
													...filters,
													dueToday: false,
													dueThisWeek: false,
													dueOnDate: null,
													dueDateRange: null,
													[filter.key]: checked,
												})
											}
										>
											<filter.icon size={13} weight="bold" />
											{filter.label}
											<Menu.CheckboxItemIndicator className="ml-auto">
												<CheckIcon size={13} weight="bold" />
											</Menu.CheckboxItemIndicator>
										</Menu.CheckboxItem>
									))}
									<Menu.SubmenuRoot>
										<Menu.SubmenuTrigger className={menuItem()}>
											<CalendarIcon size={13} weight="bold" />
											{labels.filtersDueOnDate}
											<CaretRightIcon
												size={13}
												weight="bold"
												className="ml-auto"
											/>
										</Menu.SubmenuTrigger>
										<Menu.Portal>
											<Menu.Positioner
												className="z-50 outline-none"
												sideOffset={6}
											>
												<Menu.Popup className={calendarPopup()}>
													<CalendarRange
														singleValue={filters.dueOnDate}
														value={filters.dueDateRange}
														onSelectSingle={(date) => {
															onFiltersChange({
																...filters,
																dueToday: false,
																dueThisWeek: false,
																dueOnDate: date,
																dueDateRange: null,
															});
														}}
														onSelect={(range) => {
															onFiltersChange({
																...filters,
																dueToday: false,
																dueThisWeek: false,
																dueOnDate: null,
																dueDateRange: range,
															});
															setMenuOpen(false);
														}}
														onClear={() =>
															onFiltersChange({
																...filters,
																dueOnDate: null,
																dueDateRange: null,
															})
														}
													/>
												</Menu.Popup>
											</Menu.Positioner>
										</Menu.Portal>
									</Menu.SubmenuRoot>
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
										<span
											className={checkbox({ checked: filters.hideCompleted })}
										>
											{filters.hideCompleted && (
												<CheckIcon size={10} weight="bold" />
											)}
										</span>
										{labels.filtersHideCompleted}
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

				{filters.dueOnDate && (
					<span className={chip()}>
						<CalendarIcon size={11} weight="bold" />
						{labels.filtersDueOn} {formatDueOnDate(filters.dueOnDate)}
						<button
							type="button"
							aria-label={labels.filtersRemoveDueOnDate}
							className="flex size-4 items-center justify-center rounded-full outline-none hover:bg-dark-grey/10 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/15"
							onClick={() => onFiltersChange({ ...filters, dueOnDate: null })}
						>
							<XIcon size={9} weight="bold" />
						</button>
					</span>
				)}

				{filters.dueDateRange && (
					<span className={chip()}>
						<CalendarIcon size={11} weight="bold" />
						{labels.filtersDueOn}{" "}
						{formatDueDateRange(
							filters.dueDateRange.start,
							filters.dueDateRange.end,
						)}
						<button
							type="button"
							aria-label={labels.filtersRemoveDueDateRange}
							className="flex size-4 items-center justify-center rounded-full outline-none hover:bg-dark-grey/10 focus-visible:ring-2 focus-visible:ring-redleather/50 dark:hover:bg-ginger/15"
							onClick={() =>
								onFiltersChange({ ...filters, dueDateRange: null })
							}
						>
							<XIcon size={9} weight="bold" />
						</button>
					</span>
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
