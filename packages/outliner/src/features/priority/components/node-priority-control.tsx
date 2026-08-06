import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import { FlagIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import type { PriorityName } from "../../../nodes/model/node-priority";
import { addTagTrigger } from "../../tags/components/tag-pill.styles";
import { PriorityEditor } from "./priority-editor";
import { priorityPill } from "./priority-pill.styles";

/**
 * Priority as an always-present control (the node detail header), unlike the
 * tree row's pill which only appears once a priority is set: an unset node
 * still needs somewhere to set one from.
 */
export function NodePriorityControl({
	priority,
	onChange,
}: {
	priority: PriorityName | null;
	onChange: (priority: PriorityName | null) => void;
}) {
	const labels = useOutlinerLabels();

	return (
		<Popover>
			<PopoverTrigger
				className={
					priority ? priorityPill({ level: priority }) : addTagTrigger()
				}
				aria-label={priority ? labels.changePriority : labels.setPriority}
				onClick={(event) => event.stopPropagation()}
			>
				<FlagIcon size={priority ? 11 : 10} weight="bold" />
				{priority && (
					<span className="truncate">{labels.priorityLabels[priority]}</span>
				)}
			</PopoverTrigger>
			<PopoverContent>
				<PriorityEditor priority={priority} onChange={onChange} />
			</PopoverContent>
		</Popover>
	);
}
