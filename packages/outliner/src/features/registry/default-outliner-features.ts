import { dueDateFeature } from "../due-date/due-date-feature";
import { iconFeature } from "../icon/icon-feature";
import type { OutlinerFeature } from "../model/outliner-feature.types";
import { tagsFeature } from "../tags/tags-feature";
import { taskFeature } from "../task/task-feature";

/** The tree's built-in features (icon, task type, due dates, tags), in
 * row/menu render order. Pass a subset — or additional `OutlinerFeature`s —
 * to `<VirtualTree features={...}>` to customize what a given tree shows. */
export const defaultOutlinerFeatures: OutlinerFeature[] = [
	iconFeature,
	taskFeature,
	dueDateFeature,
	tagsFeature,
];
