import {
	defaultOutlinerLabels,
	type OutlinerLabels,
	OutlinerLabelsProvider,
} from "@cascade/outliner/labels-context";
import { MAX_TAG_LENGTH } from "@cascade/outliner/node-tags";
import {
	defaultUiLabels,
	type UiLabels,
	UiLabelsProvider,
} from "@cascade/ui/labels-context";
import type { ReactNode } from "react";
import { m } from "#/paraglide/messages.js";

function createUiLabels(): UiLabels {
	return {
		...defaultUiLabels,
		loading: m.ui_loading(),
		dismissToast: m.ui_dismiss_toast(),
		calendarToday: m.ui_calendar_today(),
		calendarTomorrow: m.ui_calendar_tomorrow(),
		calendarNextWeek: m.ui_calendar_next_week(),
		calendarClear: m.ui_calendar_clear(),
		calendarPreviousMonth: m.ui_calendar_previous_month(),
		calendarNextMonth: m.ui_calendar_next_month(),
		calendarRangeSelectEnd: m.ui_calendar_range_select_end(),
	};
}

function createOutlinerLabels(): OutlinerLabels {
	return {
		...defaultOutlinerLabels,
		treeLabel: m.outliner_tree_label(),
		toggleExpand: m.outliner_toggle_expand(),
		toggleCollapse: m.outliner_toggle_collapse(),
		taskCompleted: m.outliner_task_completed(),
		dragToReorder: m.outliner_drag_handle(),
		editNodeText: m.outliner_edit_node_text(),
		convertInto: m.outliner_convert_into(),
		duplicate: m.outliner_duplicate(),
		delete: m.outliner_delete(),
		emptyTree: m.outliner_empty_tree(),
		emptyFilterResults: m.outliner_empty_filter_results(),
		rowErrorMessage: m.outliner_row_error_message(),
		rowErrorDeleteAction: m.outliner_row_error_delete_action(),
		addNode: m.outliner_add_node(),
		setIcon: m.outliner_set_icon(),
		changeIcon: m.outliner_change_icon(),
		removeIcon: m.outliner_remove_icon(),
		iconPickerSearchPlaceholder: m.outliner_icon_picker_search_placeholder(),
		iconPickerNoResults: m.outliner_icon_picker_no_results(),
		iconPickerLoading: m.outliner_icon_picker_loading(),
		setDueDate: m.outliner_set_due_date(),
		changeDueDate: m.outliner_change_due_date(),
		changeDueDateAria: m.outliner_change_due_date_aria(),
		dueToday: m.outliner_due_today(),
		dueTomorrow: m.outliner_due_tomorrow(),
		dueYesterday: m.outliner_due_yesterday(),
		dueTimeLabel: m.outliner_due_time_label(),
		dueTimeClearAria: m.outliner_due_time_clear_aria(),
		repeatLabel: m.outliner_repeat_label(),
		repeatNever: m.outliner_repeat_never(),
		repeatDaily: m.outliner_repeat_daily(),
		repeatWeekly: m.outliner_repeat_weekly(),
		repeatMonthly: m.outliner_repeat_monthly(),
		repeatCustom: m.outliner_repeat_custom(),
		repeatEvery: m.outliner_repeat_every(),
		repeatUnit: m.outliner_repeat_unit(),
		repeatDays: m.outliner_repeat_days(),
		repeatWeeks: m.outliner_repeat_weeks(),
		repeatMonths: m.outliner_repeat_months(),
		repeatApply: m.outliner_repeat_apply(),
		repeatRequiresTaskDate: m.outliner_repeat_requires_task_date(),
		repeatEveryInterval: m.outliner_repeat_every_interval({
			interval: "{interval}",
			unit: "{unit}",
		}),
		setPriority: m.outliner_set_priority(),
		changePriority: m.outliner_change_priority(),
		changePriorityAria: m.outliner_change_priority_aria(),
		priorityNone: m.outliner_priority_none(),
		priorityLabels: {
			urgent: m.outliner_priority_urgent(),
			high: m.outliner_priority_high(),
			medium: m.outliner_priority_medium(),
			low: m.outliner_priority_low(),
		},
		setStatus: m.outliner_set_status(),
		changeStatus: m.outliner_change_status(),
		changeStatusAria: m.outliner_change_status_aria(),
		statusEmpty: m.outliner_status_empty(),
		addTag: m.outliner_add_tag(),
		manageTags: m.outliner_manage_tags(),
		tagsInputPlaceholder: m.outliner_tags_input_placeholder(),
		tagHintNavigate: m.outliner_tag_hint_navigate(),
		tagHintToggle: m.outliner_tag_hint_toggle(),
		createTag: m.outliner_create_tag(),
		tagNameTooLong: m.outliner_tag_name_too_long({
			max: MAX_TAG_LENGTH,
		}),
		deleteTagAria: m.outliner_delete_tag_aria(),
		deleteTagConfirmBody: m.outliner_delete_tag_confirm_body(),
		cancel: m.outliner_cancel(),
		linkEditTitle: m.outliner_link_edit_title(),
		linkTextLabel: m.outliner_link_text_label(),
		linkUrlLabel: m.outliner_link_url_label(),
		linkOpen: m.outliner_link_open(),
		linkSave: m.outliner_link_save(),
		linkDelete: m.outliner_link_delete(),
		nodeTypeLabels: {
			...defaultOutlinerLabels.nodeTypeLabels,
			text: m.outliner_type_text(),
			task: m.outliner_type_task(),
		},
		headingLabels: {
			h1: m.outliner_block_type_h1(),
			h2: m.outliner_block_type_h2(),
			h3: m.outliner_block_type_h3(),
			h4: m.outliner_block_type_h4(),
			h5: m.outliner_block_type_h5(),
			h6: m.outliner_block_type_h6(),
		},
		filtersTrigger: m.filters_bar_trigger(),
		filtersDueDateGroup: m.filters_bar_due_date_group(),
		filtersDueToday: m.filters_bar_due_today(),
		filtersRemoveDueToday: m.filters_bar_remove_due_today(),
		filtersDueThisWeek: m.filters_bar_due_this_week(),
		filtersRemoveDueThisWeek: m.filters_bar_remove_due_this_week(),
		filtersDueOnDate: m.filters_bar_due_on_date(),
		filtersDueOn: m.filters_bar_due_on(),
		filtersRemoveDueOnDate: m.filters_bar_remove_due_on_date(),
		filtersRemoveDueDateRange: m.filters_bar_remove_due_date_range(),
		filtersPriorityGroup: m.filters_bar_priority_group(),
		filtersRemovePriority: m.filters_bar_remove_priority(),
		filtersStatusGroup: m.filters_bar_status_group(),
		filtersRemoveStatus: m.filters_bar_remove_status(),
		filtersTagsGroup: m.filters_bar_tags_group(),
		filtersSearchTags: m.filters_bar_search_tags(),
		filtersRemoveTag: m.filters_bar_remove_tag(),
		filtersTasksGroup: m.filters_bar_tasks_group(),
		filtersHideCompleted: m.filters_bar_hide_completed(),
		filtersRemoveHideCompleted: m.filters_bar_remove_hide_completed(),
		filtersShowCompleted: m.filters_bar_show_completed(),
		filtersRemoveShowCompleted: m.filters_bar_remove_show_completed(),
		filtersClear: m.filters_bar_clear(),
		convertOptionBoard: m.outliner_convert_option_board(),
		convertOptionTree: m.outliner_convert_option_tree(),
		boardUnassignedColumn: m.outliner_board_unassigned_column(),
		boardEmptyColumn: m.outliner_board_empty_column(),
		boardAddCard: m.outliner_board_add_card(),
	};
}

export function AppLabelsProvider({ children }: { children: ReactNode }) {
	return (
		<UiLabelsProvider labels={createUiLabels()}>
			<OutlinerLabelsProvider labels={createOutlinerLabels()}>
				{children}
			</OutlinerLabelsProvider>
		</UiLabelsProvider>
	);
}
