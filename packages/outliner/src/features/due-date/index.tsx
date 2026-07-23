import type { OutlinerFeature } from "../types";
import { DueDateMenuItem } from "./due-date-menu-item";
import { NodeDueDatePill } from "./node-due-date-pill";

export interface DueDateFeatureContext {
	dueDate: Date | null;
	completed: boolean;
	onSetDueDate: (date: Date | null) => void;
	/** Clicking the trailing pill activates a "due on this date" filter
	 * instead of opening the change-date popover when provided — changing
	 * the date itself still works via the "Change date" context-menu item. */
	onDueDateClick?: (date: Date) => void;
}

/** Due dates: a trailing pill on rows that have one, plus a "Set/Change
 * date" context-menu submenu. */
export const dueDateFeature: OutlinerFeature<DueDateFeatureContext> = {
	id: "due-date",
	renderTrailing: (ctx) =>
		ctx.dueDate ? (
			<NodeDueDatePill
				dueDate={ctx.dueDate}
				completed={ctx.completed}
				onChange={ctx.onSetDueDate}
				onDueDateClick={ctx.onDueDateClick}
			/>
		) : null,
	renderContextMenuItem: (ctx) => <DueDateMenuItem ctx={ctx} />,
};
