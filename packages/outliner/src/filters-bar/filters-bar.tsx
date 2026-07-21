import { Menu } from "@base-ui/react";
import { CalendarRange } from "@cascade/ui/calendar-range";
import {
	CalendarDotIcon,
	CalendarDotsIcon,
	CalendarIcon,
	CaretRightIcon,
	CheckIcon,
	CheckSquareIcon,
	FunnelIcon,
	TagIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { NodeTagsEditor } from "../features/tags/node-tags-editor/node-tags-editor";
import { useOutlinerLabels } from "../labels-context";
import { hasActiveFilters, noFilters } from "../node-filters";
import { formatDueDateRange, formatDueOnDate } from "./format-due-date";
import {
	calendarPopup,
	checkbox,
	chip,
	clearAll,
	groupLabel,
	menuItem,
	popup,
	removeChipButton,
	trigger,
} from "./styles";
import type { FiltersBarProps } from "./types";

/**
 * Entry point for outliner filters: a Filter menu grouped by field, active
 * filters rendered as removable chips, and a match count once something is
 * active. The due-date filters are mutually exclusive; "Hide completed"
 * stacks on top of any of them.
 */
export function FiltersBar({
	filters,
	existingTags = [],
	onFiltersChange,
}: FiltersBarProps) {
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
		<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-3 dark:border-surface/10">
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
								{existingTags.length > 0 && (
									<Menu.SubmenuRoot>
										<Menu.SubmenuTrigger className={menuItem()}>
											<TagIcon size={13} weight="bold" />
											{labels.filtersTagsGroup}
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
												<Menu.Popup className={popup()}>
													<NodeTagsEditor
														mode="filter"
														tags={filters.tags}
														existingTags={existingTags}
														onChange={(tags) =>
															onFiltersChange({ ...filters, tags })
														}
													/>
												</Menu.Popup>
											</Menu.Positioner>
										</Menu.Portal>
									</Menu.SubmenuRoot>
								)}
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
									className={removeChipButton()}
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
							className={removeChipButton()}
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
							className={removeChipButton()}
							onClick={() =>
								onFiltersChange({ ...filters, dueDateRange: null })
							}
						>
							<XIcon size={9} weight="bold" />
						</button>
					</span>
				)}

				{filters.tags.map((tag) => (
					<span key={tag} className={chip()}>
						<TagIcon size={11} weight="bold" />
						{tag}
						<button
							type="button"
							aria-label={`${labels.filtersRemoveTag}: ${tag}`}
							className={removeChipButton()}
							onClick={() =>
								onFiltersChange({
									...filters,
									tags: filters.tags.filter((name) => name !== tag),
								})
							}
						>
							<XIcon size={9} weight="bold" />
						</button>
					</span>
				))}

				{filters.hideCompleted && (
					<span className={chip()}>
						<CheckSquareIcon size={11} weight="bold" />
						{labels.filtersHideCompleted}
						<button
							type="button"
							aria-label={labels.filtersRemoveHideCompleted}
							className={removeChipButton()}
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
						className={clearAll()}
						onClick={() => onFiltersChange(noFilters)}
					>
						{labels.filtersClear}
					</button>
				</div>
			)}
		</div>
	);
}
