import { createContext, type ReactNode, use } from "react";
import { type NodeTypeName, nodeTypeDefs, nodeTypeNames } from "./node-types";

export interface OutlinerLabels {
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
	deleteTagAria: string;
	deleteTagConfirmBody: string;
	cancel: string;
	nodeTypeLabels: Record<NodeTypeName, string>;
	filtersTrigger: string;
	filtersDueDateGroup: string;
	filtersDueToday: string;
	filtersRemoveDueToday: string;
	filtersClear: string;
}

export const defaultOutlinerLabels: OutlinerLabels = {
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
	deleteTagAria: "Delete tag",
	deleteTagConfirmBody:
		"This removes it from every node it's on. This can't be undone.",
	cancel: "Cancel",
	nodeTypeLabels: Object.fromEntries(
		nodeTypeNames.map((type) => [type, nodeTypeDefs[type].label]),
	) as Record<NodeTypeName, string>,
	filtersTrigger: "Filter",
	filtersDueDateGroup: "Due date",
	filtersDueToday: "Due today",
	filtersRemoveDueToday: "Remove Due today filter",
	filtersClear: "Clear filters",
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
