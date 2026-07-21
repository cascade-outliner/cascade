import { Calendar } from "@cascade/ui/calendar";
import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { CalendarIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../labels-context";
import { NodeDueDatePill } from "../../node-due-date-pill";
import type { OutlinerFeature, RowFeatureContext } from "../types";

function DueDateMenuItem({ ctx }: { ctx: RowFeatureContext }) {
	const labels = useOutlinerLabels();
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger
				icon={<CalendarIcon size={14} weight="bold" />}
				openOnHover
				delay={150}
			>
				{ctx.dueDate ? labels.changeDueDate : labels.setDueDate}
			</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				<Calendar
					value={ctx.dueDate}
					onSelect={ctx.onSetDueDate}
					onClear={() => ctx.onSetDueDate(null)}
				/>
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}

/** Due dates: a trailing pill on rows that have one, plus a "Set/Change
 * date" context-menu submenu. */
export const dueDateFeature: OutlinerFeature = {
	id: "due-date",
	renderTrailing: (ctx) =>
		ctx.dueDate ? (
			<NodeDueDatePill
				dueDate={ctx.dueDate}
				completed={ctx.completed}
				onChange={ctx.onSetDueDate}
			/>
		) : null,
	renderContextMenuItem: (ctx) => <DueDateMenuItem ctx={ctx} />,
};
