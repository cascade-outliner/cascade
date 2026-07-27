import { Menu } from "@base-ui/react";
import {
	CaretRightIcon,
	CheckIcon,
	FunnelIcon,
	TagIcon,
} from "@phosphor-icons/react/ssr";
import { useState } from "react";
import { NodeTagsEditor } from "../../features/tags/components/node-tags-editor/node-tags-editor";
import { useOutlinerLabels } from "../../i18n/outliner-labels-context";
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
	onFiltersChange,
	completedFilterMode = "hide",
}: FiltersBarProps) {
	const labels = useOutlinerLabels();
	const [open, setOpen] = useState(false);
	const completedChecked =
		completedFilterMode === "show"
			? !filters.hideCompleted
			: filters.hideCompleted;

	return (
		<Menu.Root open={open} onOpenChange={setOpen}>
			<Menu.Trigger className={trigger()}>
				<FunnelIcon size={12} weight="bold" />
				{labels.filtersTrigger}
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner className="z-50 outline-none" sideOffset={6}>
					<Menu.Popup className={popup()}>
						<DueDateFilterMenu
							filters={filters}
							onFiltersChange={onFiltersChange}
							onCompleteSelection={() => setOpen(false)}
						/>
						{existingTags.length > 0 && (
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
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}
