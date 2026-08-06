import { Calendar } from "@cascade/ui/calendar";
import { TimePicker } from "@cascade/ui/time-picker";
import type { CalendarTimeString } from "../../../dates/calendar-time";
import type {
	RecurrenceInput,
	RecurrenceRule,
} from "../../../dates/recurrence";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import { RecurrenceEditor } from "./recurrence-editor";

interface DueDateEditorProps {
	dueDate: Date | null;
	dueTime: CalendarTimeString | null;
	recurrence: RecurrenceRule | null;
	recurrenceEnabled: boolean;
	onChangeDate: (date: Date | null, time: CalendarTimeString | null) => void;
	onChangeRecurrence: (recurrence: RecurrenceInput | null) => void;
}

/**
 * The date + time + recurrence editor shown for a due date, shared between
 * the row pill's popover and the row's context-menu submenu so both stay
 * visually consistent (spacing, dividers) regardless of their host
 * container's own padding, instead of each call site re-deriving it.
 */
export function DueDateEditor({
	dueDate,
	dueTime,
	recurrence,
	recurrenceEnabled,
	onChangeDate,
	onChangeRecurrence,
}: DueDateEditorProps) {
	const labels = useOutlinerLabels();

	return (
		<div className="p-1">
			<Calendar
				value={dueDate}
				onSelect={(date) => onChangeDate(date, dueTime)}
				onClear={() => onChangeDate(null, null)}
			/>
			<div className="mt-3 flex items-center justify-between gap-3 border-ink/10 border-t pt-3 dark:border-surface/15">
				<span className="text-sm font-medium">{labels.dueTimeLabel}</span>
				<TimePicker
					value={dueTime}
					onChange={(time) => onChangeDate(dueDate, time)}
					clearAriaLabel={labels.dueTimeClearAria}
				/>
			</div>
			<RecurrenceEditor
				recurrence={recurrence}
				enabled={recurrenceEnabled}
				onChange={onChangeRecurrence}
			/>
		</div>
	);
}
