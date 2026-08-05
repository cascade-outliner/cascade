import { Calendar } from "@cascade/ui/calendar";
import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { TimePicker } from "@cascade/ui/time-picker";
import { CalendarIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import type { DueDateFeatureContext } from "../due-date-feature";
import { formatRecurrence, RecurrenceEditor } from "./recurrence-editor";

export function DueDateMenuItem({ ctx }: { ctx: DueDateFeatureContext }) {
	const labels = useOutlinerLabels();
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger
				icon={<CalendarIcon size={14} weight="bold" />}
				openOnHover
				delay={150}
			>
				{ctx.dueDate ? labels.changeDueDate : labels.setDueDate}
				{ctx.recurrence ? ` · ${formatRecurrence(ctx.recurrence, labels)}` : ""}
			</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				<Calendar
					value={ctx.dueDate}
					onSelect={(date) => ctx.onSetDueDate(date, ctx.dueTime)}
					onClear={() => ctx.onSetDueDate(null, null)}
				/>
				<TimePicker
					value={ctx.dueTime}
					onChange={(time) => ctx.onSetDueDate(ctx.dueDate, time)}
					label={labels.dueTimeLabel}
					clearAriaLabel={labels.dueTimeClearAria}
				/>
				<RecurrenceEditor
					recurrence={ctx.recurrence}
					enabled={ctx.isTask && ctx.dueDate !== null}
					onChange={ctx.onSetRecurrence}
				/>
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
