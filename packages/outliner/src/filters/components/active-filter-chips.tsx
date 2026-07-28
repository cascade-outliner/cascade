import { AnimatePresence, m } from "@cascade/ui/motion";
import {
	smallEnterVariants,
	smallExitVariants,
} from "@cascade/ui/motion-variants";
import {
	CalendarIcon,
	CheckSquareIcon,
	TagIcon,
	XIcon,
} from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { useOutlinerLabels } from "../../i18n/outliner-labels-context";
import {
	formatDueDateRange,
	formatDueOnDate,
} from "../model/filter-date-labels";
import type { NodeFilters } from "../model/node-filters";
import { getRelativeFilterOptions } from "./due-date-filter-menu";
import { chip, removeChipButton } from "./filters-bar.styles";

interface ActiveFilterChipsProps {
	filters: NodeFilters;
	onFiltersChange: (filters: NodeFilters) => void;
	completedFilterMode?: "hide" | "show";
}

export function ActiveFilterChips({
	filters,
	onFiltersChange,
	completedFilterMode = "hide",
}: ActiveFilterChipsProps) {
	const labels = useOutlinerLabels();
	const relativeFilters = getRelativeFilterOptions(labels);
	const completedFilterActive =
		completedFilterMode === "show"
			? !filters.hideCompleted
			: filters.hideCompleted;

	return (
		<AnimatePresence initial={false}>
			{relativeFilters.map(
				(filter) =>
					filters[filter.key] && (
						<FilterChip
							key={`relative:${filter.key}`}
							icon={<CalendarIcon size={11} weight="bold" />}
							label={filter.label}
							removeLabel={filter.removeLabel}
							onRemove={() =>
								onFiltersChange({ ...filters, [filter.key]: false })
							}
						/>
					),
			)}

			{filters.dueOnDate && (
				<FilterChip
					key="date:due-on"
					icon={<CalendarIcon size={11} weight="bold" />}
					label={
						<>
							{labels.filtersDueOn} {formatDueOnDate(filters.dueOnDate)}
						</>
					}
					removeLabel={labels.filtersRemoveDueOnDate}
					onRemove={() => onFiltersChange({ ...filters, dueOnDate: null })}
				/>
			)}

			{filters.dueDateRange && (
				<FilterChip
					key="date:range"
					icon={<CalendarIcon size={11} weight="bold" />}
					label={
						<>
							{labels.filtersDueOn}{" "}
							{formatDueDateRange(
								filters.dueDateRange.start,
								filters.dueDateRange.end,
							)}
						</>
					}
					removeLabel={labels.filtersRemoveDueDateRange}
					onRemove={() => onFiltersChange({ ...filters, dueDateRange: null })}
				/>
			)}

			{filters.tags.map((tag) => (
				<FilterChip
					key={`tag:${tag}`}
					icon={<TagIcon size={11} weight="bold" />}
					label={tag}
					removeLabel={`${labels.filtersRemoveTag}: ${tag}`}
					onRemove={() =>
						onFiltersChange({
							...filters,
							tags: filters.tags.filter((name) => name !== tag),
						})
					}
				/>
			))}

			{completedFilterActive && (
				<FilterChip
					key="completion"
					icon={<CheckSquareIcon size={11} weight="bold" />}
					label={
						completedFilterMode === "show"
							? labels.filtersShowCompleted
							: labels.filtersHideCompleted
					}
					removeLabel={
						completedFilterMode === "show"
							? labels.filtersRemoveShowCompleted
							: labels.filtersRemoveHideCompleted
					}
					onRemove={() =>
						onFiltersChange({
							...filters,
							hideCompleted: completedFilterMode === "show",
						})
					}
				/>
			)}
		</AnimatePresence>
	);
}

function FilterChip({
	icon,
	label,
	removeLabel,
	onRemove,
}: {
	icon: ReactNode;
	label: ReactNode;
	removeLabel: string;
	onRemove: () => void;
}) {
	return (
		<m.span
			className={chip()}
			variants={{ ...smallEnterVariants, ...smallExitVariants }}
			initial="initial"
			animate="animate"
			exit="exit"
		>
			{icon}
			{label}
			<button
				type="button"
				aria-label={removeLabel}
				className={removeChipButton()}
				onClick={onRemove}
			>
				<XIcon size={9} weight="bold" />
			</button>
		</m.span>
	);
}
