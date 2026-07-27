import { Calendar } from "@cascade/ui/calendar";
import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
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
					onSelect={ctx.onSetDueDate}
					onClear={() => ctx.onSetDueDate(null)}
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
