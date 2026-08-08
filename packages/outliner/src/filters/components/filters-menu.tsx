import { Menu } from "@base-ui/react";
import {
	CaretRightIcon,
	CheckIcon,
	CircleDashedIcon,
	FlagIcon,
	FunnelIcon,
	TagIcon,
} from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { allNodeCapabilities } from "../../features/model/node-capabilities";
import { StatusEditor } from "../../features/status/components/status-editor";
import { NodeTagsEditor } from "../../features/tags/components/node-tags-editor/node-tags-editor";
import { useOutlinerLabels } from "../../i18n/outliner-labels-context";
import { PRIORITY_NAMES } from "../../nodes/model/node-priority";
import type { FiltersBarProps } from "../model/filters-bar.types";
import { DueDateFilterMenu } from "./due-date-filter-menu";
import {
	checkbox,
	groupLabel,
	menuItem,
	popup,
	trigger,
} from "./filters-bar.styles";

export function FiltersMenu({
	filters,
	existingTags = [],
	existingStatuses = [],
	onFiltersChange,
	completedFilterMode = "hide",
	capabilities = allNodeCapabilities,
}: FiltersBarProps) {
	const labels = useOutlinerLabels();
	const [open, setOpen] = useState(false);
	const completedChecked =
		completedFilterMode === "show"
			? !filters.hideCompleted
			: filters.hideCompleted;
	const hasFilterGroups =
		capabilities.has("due-date") ||
		capabilities.has("priority") ||
		(capabilities.has("status") && existingStatuses.length > 0) ||
		(capabilities.has("tags") && existingTags.length > 0) ||
		capabilities.has("task");

	if (!hasFilterGroups) return null;

	return (
		<Menu.Root open={open} onOpenChange={setOpen}>
			<Menu.Trigger
				className={trigger()}
				data-onboarding="filters-menu-trigger"
			>
				<FunnelIcon size={12} weight="bold" />
				{labels.filtersTrigger}
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner className="z-50 outline-none" sideOffset={6}>
					<Menu.Popup className={popup()}>
						{capabilities.has("due-date") && (
							<DueDateFilterMenu
								filters={filters}
								onFiltersChange={onFiltersChange}
								onCompleteSelection={() => setOpen(false)}
							/>
						)}
						{capabilities.has("priority") && (
							<Menu.SubmenuRoot>
								<Menu.SubmenuTrigger className={menuItem()}>
									<FlagIcon size={13} weight="bold" />
									{labels.filtersPriorityGroup}
									<CaretRightIcon size={13} weight="bold" className="ml-auto" />
								</Menu.SubmenuTrigger>
								<Menu.Portal>
									<Menu.Positioner className="z-50 outline-none" sideOffset={6}>
										<Menu.Popup className={popup()}>
											{PRIORITY_NAMES.map((level) => {
												const checked = filters.priorities.includes(level);
												return (
													<Menu.CheckboxItem
														key={level}
														className={menuItem()}
														checked={checked}
														onCheckedChange={(next) =>
															onFiltersChange({
																...filters,
																priorities: next
																	? [...filters.priorities, level]
																	: filters.priorities.filter(
																			(name) => name !== level,
																		),
															})
														}
													>
														<span className={checkbox({ checked })}>
															{checked && <CheckIcon size={10} weight="bold" />}
														</span>
														{labels.priorityLabels[level]}
													</Menu.CheckboxItem>
												);
											})}
										</Menu.Popup>
									</Menu.Positioner>
								</Menu.Portal>
							</Menu.SubmenuRoot>
						)}
						{capabilities.has("status") && existingStatuses.length > 0 && (
							<Menu.SubmenuRoot>
								<Menu.SubmenuTrigger className={menuItem()}>
									<CircleDashedIcon size={13} weight="bold" />
									{labels.filtersStatusGroup}
									<CaretRightIcon size={13} weight="bold" className="ml-auto" />
								</Menu.SubmenuTrigger>
								<Menu.Portal>
									<Menu.Positioner className="z-50 outline-none" sideOffset={6}>
										<Menu.Popup className={popup()}>
											<StatusEditor
												mode="filter"
												statusId={null}
												selectedIds={filters.statusIds}
												existingStatuses={existingStatuses}
												onSelect={(statusId) =>
													onFiltersChange({
														...filters,
														statusIds:
															statusId === null
																? []
																: filters.statusIds.includes(statusId)
																	? filters.statusIds.filter(
																			(id) => id !== statusId,
																		)
																	: [...filters.statusIds, statusId],
													})
												}
											/>
										</Menu.Popup>
									</Menu.Positioner>
								</Menu.Portal>
							</Menu.SubmenuRoot>
						)}
						{capabilities.has("tags") && existingTags.length > 0 && (
							<Menu.SubmenuRoot>
								<Menu.SubmenuTrigger className={menuItem()}>
									<TagIcon size={13} weight="bold" />
									{labels.filtersTagsGroup}
									<CaretRightIcon size={13} weight="bold" className="ml-auto" />
								</Menu.SubmenuTrigger>
								<Menu.Portal>
									<Menu.Positioner className="z-50 outline-none" sideOffset={6}>
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
						{capabilities.has("task") && (
							<Menu.Group>
								<Menu.GroupLabel className={groupLabel()}>
									{labels.filtersTasksGroup}
								</Menu.GroupLabel>
								<Menu.CheckboxItem
									className={menuItem()}
									checked={completedChecked}
									closeOnClick
									onCheckedChange={(checked) =>
										onFiltersChange({
											...filters,
											hideCompleted:
												completedFilterMode === "show" ? !checked : checked,
										})
									}
								>
									<span className={checkbox({ checked: completedChecked })}>
										{completedChecked && <CheckIcon size={10} weight="bold" />}
									</span>
									{completedFilterMode === "show"
										? labels.filtersShowCompleted
										: labels.filtersHideCompleted}
								</Menu.CheckboxItem>
							</Menu.Group>
						)}
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
