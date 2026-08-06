import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { CalendarIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import type { DueDateFeatureContext } from "../due-date-feature";
import { DueDateEditor } from "./due-date-editor";
import { formatRecurrence } from "./recurrence-editor";

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
				<DueDateEditor
					dueDate={ctx.dueDate}
					dueTime={ctx.dueTime}
					recurrence={ctx.recurrence}
					recurrenceEnabled={ctx.isTask && ctx.dueDate !== null}
					onChangeDate={ctx.onSetDueDate}
					onChangeRecurrence={ctx.onSetRecurrence}
				/>
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
