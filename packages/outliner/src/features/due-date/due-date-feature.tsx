import type { CalendarTimeString } from "../../dates/calendar-time";
import type { RecurrenceInput, RecurrenceRule } from "../../dates/recurrence";
import type { OutlinerFeature } from "../model/outliner-feature.types";
import { DueDateMenuItem } from "./components/due-date-menu-item";
import { NodeDueDatePill } from "./components/node-due-date-pill";

export interface DueDateFeatureContext {
	dueDate: Date | null;
	dueTime: CalendarTimeString | null;
	completed: boolean;
	isTask: boolean;
	recurrence: RecurrenceRule | null;
	onSetDueDate: (date: Date | null, time: CalendarTimeString | null) => void;
	onSetRecurrence: (recurrence: RecurrenceInput | null) => void;
}

/** Due dates: a trailing pill on rows that have one, plus a "Set/Change
 * date" context-menu submenu. */
export const dueDateFeature: OutlinerFeature<DueDateFeatureContext> = {
	id: "due-date",
	renderTrailing: (ctx) =>
		ctx.dueDate ? (
			<NodeDueDatePill
				dueDate={ctx.dueDate}
				dueTime={ctx.dueTime}
				completed={ctx.completed}
				recurrence={ctx.recurrence}
				recurrenceEnabled={ctx.isTask}
				onChange={ctx.onSetDueDate}
				onRecurrenceChange={ctx.onSetRecurrence}
			/>
		) : null,
	renderContextMenuItem: (ctx) => <DueDateMenuItem ctx={ctx} />,
};
