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
	addNode: string;
	nodeTypeLabels: Record<NodeTypeName, string>;
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
	addNode: "Add node",
	nodeTypeLabels: Object.fromEntries(
		nodeTypeNames.map((type) => [type, nodeTypeDefs[type].label]),
	) as Record<NodeTypeName, string>,
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
