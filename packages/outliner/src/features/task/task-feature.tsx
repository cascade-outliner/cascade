import { NodeCheckbox } from "../../node-checkbox";
import type { OutlinerFeature } from "../types";

/**
 * Task type: renders the completion checkbox on task-type rows. Doesn't
 * contribute a context-menu item — converting into/out of "task" happens via
 * the core "Convert into" submenu, driven by the node-type registry itself
 * rather than by individual features.
 */
export const taskFeature: OutlinerFeature = {
	id: "task",
	renderLeading: (ctx) =>
		ctx.row.type === "task" ? (
			<NodeCheckbox metadata={ctx.row.metadata} onToggle={ctx.onToggleTask} />
		) : null,
};
