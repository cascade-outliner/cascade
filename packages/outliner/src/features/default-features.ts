import { dueDateFeature } from "./due-date/due-date-feature";
import { tagsFeature } from "./tags/tags-feature";
import { taskFeature } from "./task/task-feature";
import type { OutlinerFeature } from "./types";

/** The tree's built-in features (task type, due dates, tags), in row/menu
 * render order. Pass a subset — or additional `OutlinerFeature`s — to
 * `<VirtualTree features={...}>` to customize what a given tree shows. */
export const defaultOutlinerFeatures: OutlinerFeature[] = [
	taskFeature,
	dueDateFeature,
	tagsFeature,
];
