import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import {
	type StatusSummary,
	toStatusColor,
} from "../../../nodes/model/node-statuses";
import { tagPill } from "../../tags/components/tag-pill.styles";
import { StatusEditor } from "./status-editor";
import { statusDot } from "./status-pill.styles";

/** A row's (or the detail header's) status pill; clicking it opens the same
 * picker the context-menu submenu uses. */
export function NodeStatusPill({
	status,
	existingStatuses,
	onSelect,
}: {
	status: StatusSummary;
	existingStatuses: StatusSummary[];
	onSelect: (statusId: string | null) => void;
}) {
	const labels = useOutlinerLabels();
	const hue = toStatusColor(status.color);

	return (
		<Popover>
			<PopoverTrigger
				className={tagPill({ hue, filterable: true })}
				aria-label={labels.changeStatusAria}
				onClick={(e) => e.stopPropagation()}
			>
				<span className={statusDot({ hue })} />
				<span className="truncate">{status.name}</span>
			</PopoverTrigger>
			<PopoverContent>
				<StatusEditor
					statusId={status.id}
					existingStatuses={existingStatuses}
					onSelect={onSelect}
				/>
			</PopoverContent>
		</Popover>
	);
}
