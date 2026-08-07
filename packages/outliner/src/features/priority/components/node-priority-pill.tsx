import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import { FlagIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import type { PriorityName } from "../../../nodes/model/node-priority";
import { PriorityEditor } from "./priority-editor";
import { priorityPill } from "./priority-pill.styles";

/** A row's (or the detail header's) priority pill; clicking it opens the
 * same editor the context-menu submenu uses. */
export function NodePriorityPill({
	priority,
	onChange,
}: {
	priority: PriorityName;
	onChange: (priority: PriorityName | null) => void;
}) {
	const labels = useOutlinerLabels();

	return (
		<Popover>
			<PopoverTrigger
				className={priorityPill({ level: priority })}
				aria-label={labels.changePriorityAria}
				onClick={(e) => e.stopPropagation()}
			>
				<FlagIcon size={11} weight="bold" className="shrink-0" />
				<span className="truncate">{labels.priorityLabels[priority]}</span>
			</PopoverTrigger>
			<PopoverContent>
				<PriorityEditor priority={priority} onChange={onChange} />
			</PopoverContent>
		</Popover>
	);
}
