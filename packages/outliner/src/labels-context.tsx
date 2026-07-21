import { createContext, type ReactNode, use } from "react";
import type { BlockType } from "./lexical/lexical-content";
import { MAX_TAG_LENGTH } from "./node-tags";
import { type NodeTypeName, nodeTypeDefs, nodeTypeNames } from "./node-types";

export interface OutlinerLabels {
	treeLabel: string;
	toggleExpand: string;
	toggleCollapse: string;
	taskCompleted: string;
	dragToReorder: string;
	editNodeText: string;
	convertInto: string;
	delete: string;
	emptyTree: string;
	emptyFilterResults: string;
	addNode: string;
	setDueDate: string;
	changeDueDate: string;
	changeDueDateAria: string;
	dueToday: string;
	dueTomorrow: string;
	dueYesterday: string;
	addTag: string;
	manageTags: string;
	tagsInputPlaceholder: string;
	tagHintNavigate: string;
	tagHintToggle: string;
	createTag: string;
	tagNameTooLong: string;
	deleteTagAria: string;
	deleteTagConfirmBody: string;
	cancel: string;
	linkEditTitle: string;
	linkTextLabel: string;
	linkUrlLabel: string;
	linkOpen: string;
	linkSave: string;
	linkDelete: string;
	nodeTypeLabels: Record<NodeTypeName, string>;
	headingLabels: Record<Exclude<BlockType, "paragraph">, string>;
	filtersTrigger: string;
	filtersDueDateGroup: string;
	filtersDueToday: string;
	filtersRemoveDueToday: string;
	filtersDueThisWeek: string;
	filtersRemoveDueThisWeek: string;
	filtersDueOnDate: string;
	filtersDueOn: string;
	filtersRemoveDueOnDate: string;
	filtersRemoveDueDateRange: string;
	filtersTasksGroup: string;
	filtersHideCompleted: string;
	filtersRemoveHideCompleted: string;
	filtersClear: string;
	selectionCount: (count: number) => string;
	clearSelection: string;
	bulkTagsTrigger: string;
	bulkTagInputPlaceholder: string;
	bulkAddTagAction: string;
	bulkRemoveTagAction: string;
	bulkDueDateTrigger: string;
	bulkDeleteTrigger: string;
	bulkDeleteConfirmTitle: (count: number) => string;
	bulkDeleteConfirmBody: string;
}

export const defaultOutlinerLabels: OutlinerLabels = {
	treeLabel: "Nodes",
	toggleExpand: "Expand",
	toggleCollapse: "Collapse",
	taskCompleted: "Task completed",
	dragToReorder: "Drag to reorder",
	editNodeText: "Edit node text",
	convertInto: "Convert into",
	delete: "Delete",
	emptyTree: "This tree is empty. Add a node to get started.",
	emptyFilterResults: "No nodes match the current filters.",
	addNode: "Add node",
	setDueDate: "Set date",
	changeDueDate: "Change date",
	changeDueDateAria: "Change due date",
	dueToday: "Today",
	dueTomorrow: "Tomorrow",
	dueYesterday: "Yesterday",
	addTag: "Add tag",
	manageTags: "Manage tags",
	tagsInputPlaceholder: "Add tag…",
	tagHintNavigate: "navigate",
	tagHintToggle: "toggle",
	createTag: "Create",
	tagNameTooLong: `Tag name is too long (max ${MAX_TAG_LENGTH} characters)`,
	deleteTagAria: "Delete tag",
	deleteTagConfirmBody:
		"This removes it from every node it's on. This can't be undone.",
	cancel: "Cancel",
	linkEditTitle: "Edit link",
	linkTextLabel: "Text",
	linkUrlLabel: "URL",
	linkOpen: "Open link",
	linkSave: "Save",
	linkDelete: "Remove link",
	nodeTypeLabels: Object.fromEntries(
		nodeTypeNames.map((type) => [type, nodeTypeDefs[type].label]),
	) as Record<NodeTypeName, string>,
	headingLabels: {
		h1: "Heading 1",
		h2: "Heading 2",
		h3: "Heading 3",
		h4: "Heading 4",
		h5: "Heading 5",
		h6: "Heading 6",
	},
	filtersTrigger: "Filter",
	filtersDueDateGroup: "Due date",
	filtersDueToday: "Due today",
	filtersRemoveDueToday: "Remove Due today filter",
	filtersDueThisWeek: "Due this week",
	filtersRemoveDueThisWeek: "Remove Due this week filter",
	filtersDueOnDate: "Due on date",
	filtersDueOn: "Due",
	filtersRemoveDueOnDate: "Remove due date filter",
	filtersRemoveDueDateRange: "Remove due date range filter",
	filtersTasksGroup: "Tasks",
	filtersHideCompleted: "Hide completed",
	filtersRemoveHideCompleted: "Remove Hide completed filter",
	filtersClear: "Clear filters",
	selectionCount: (count) => `${count} selected`,
	clearSelection: "Clear selection",
	bulkTagsTrigger: "Tag selection",
	bulkTagInputPlaceholder: "Tag name…",
	bulkAddTagAction: "Add",
	bulkRemoveTagAction: "Remove",
	bulkDueDateTrigger: "Set due date for selection",
	bulkDeleteTrigger: "Delete selection",
	bulkDeleteConfirmTitle: (count) => `Delete ${count} nodes?`,
	bulkDeleteConfirmBody:
		"Deletes each selected node and its children. This can't be undone.",
};

const OutlinerLabelsContext = createContext<OutlinerLabels | null>(null);

export function OutlinerLabelsProvider({
	labels,
	children,
}: {
	labels: OutlinerLabels;
	children: ReactNode;
}) {
	return (
		<OutlinerLabelsContext value={labels}>{children}</OutlinerLabelsContext>
	);
}

export function useOutlinerLabels(): OutlinerLabels {
	return use(OutlinerLabelsContext) ?? defaultOutlinerLabels;
}
