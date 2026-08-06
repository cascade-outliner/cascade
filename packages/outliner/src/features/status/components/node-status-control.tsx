import { Popover, PopoverContent, PopoverTrigger } from "@cascade/ui/popover";
import { CircleDashedIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import {
	type StatusSummary,
	toStatusColor,
} from "../../../nodes/model/node-statuses";
import { addTagTrigger, tagPill } from "../../tags/components/tag-pill.styles";
import { StatusEditor } from "./status-editor";
import { statusDot } from "./status-pill.styles";

/**
 * Status as an always-present control (the node detail header), unlike the
 * tree row's pill which only appears once a status is set: an unset node
 * still needs somewhere to set one from.
 */
export function NodeStatusControl({
	status,
	existingStatuses,
	onSelect,
	onCreateStatus,
	onDeleteStatus,
}: {
	status: StatusSummary | null;
	existingStatuses: StatusSummary[];
	onSelect: (statusId: string | null) => void;
	onCreateStatus?: (name: string) => Promise<StatusSummary | null>;
	onDeleteStatus?: (id: string) => void | Promise<void>;
}) {
	const labels = useOutlinerLabels();
	const hue = status ? toStatusColor(status.color) : null;

	return (
		<Popover>
			<PopoverTrigger
				className={hue ? tagPill({ hue }) : addTagTrigger()}
				aria-label={status ? labels.changeStatus : labels.setStatus}
				onClick={(event) => event.stopPropagation()}
			>
				{status && hue ? (
					<>
						<span className={statusDot({ hue })} />
						<span className="truncate">{status.name}</span>
					</>
				) : (
					<CircleDashedIcon size={10} weight="bold" />
				)}
			</PopoverTrigger>
			<PopoverContent>
				<StatusEditor
					statusId={status?.id ?? null}
					existingStatuses={existingStatuses}
					onSelect={onSelect}
					onCreateStatus={onCreateStatus}
					onDeleteStatus={onDeleteStatus}
				/>
			</PopoverContent>
		</Popover>
	);
}
