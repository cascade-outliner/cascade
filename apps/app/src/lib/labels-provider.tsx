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
		addNode: m.outliner_add_node(),
		setDueDate: m.outliner_set_due_date(),
		changeDueDate: m.outliner_change_due_date(),
		changeDueDateAria: m.outliner_change_due_date_aria(),
		dueToday: m.outliner_due_today(),
		dueTomorrow: m.outliner_due_tomorrow(),
		dueYesterday: m.outliner_due_yesterday(),
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
		filtersTagsGroup: m.filters_bar_tags_group(),
		filtersSearchTags: m.filters_bar_search_tags(),
		filtersRemoveTag: m.filters_bar_remove_tag(),
		filtersTasksGroup: m.filters_bar_tasks_group(),
		filtersHideCompleted: m.filters_bar_hide_completed(),
		filtersRemoveHideCompleted: m.filters_bar_remove_hide_completed(),
		filtersClear: m.filters_bar_clear(),
		versionHistory: m.outliner_version_history(),
		versionHistoryCloseAria: m.outliner_version_history_close_aria(),
		versionHistoryEmpty: m.outliner_version_history_empty(),
		versionHistoryRestore: m.outliner_version_history_restore(),
		versionHistoryDeletedBadge: m.outliner_version_history_deleted_badge(),
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
