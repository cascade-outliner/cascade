import { dueDateFeature } from "./due-date";
import { tagsFeature } from "./tags";
import { taskFeature } from "./task";
import type { OutlinerFeature } from "./types";
import { versionHistoryFeature } from "./version-history";

/** The tree's built-in features (task type, due dates, tags, version
 * history), in row/menu render order. Pass a subset — or additional
 * `OutlinerFeature`s — to `<VirtualTree features={...}>` to customize what
 * a given tree shows. */
export const defaultOutlinerFeatures: OutlinerFeature[] = [
	taskFeature,
	dueDateFeature,
	tagsFeature,
	versionHistoryFeature,
];
