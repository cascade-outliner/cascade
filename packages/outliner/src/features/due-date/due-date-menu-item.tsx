import { Calendar } from "@cascade/ui/calendar";
import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { CalendarIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../labels-context";
import type { DueDateFeatureContext } from "./index";

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
