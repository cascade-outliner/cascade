import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { CircleDashedIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import type { StatusFeatureContext } from "../status-feature";
import { StatusEditor } from "./status-editor";

export function StatusMenuItem({ ctx }: { ctx: StatusFeatureContext }) {
	const labels = useOutlinerLabels();
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger
				icon={<CircleDashedIcon size={14} weight="bold" />}
				openOnHover
				delay={150}
			>
				{ctx.status ? labels.changeStatus : labels.setStatus}
			</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				<StatusEditor
					statusId={ctx.status?.id ?? null}
					existingStatuses={ctx.existingStatuses}
					onSelect={ctx.onSetStatus}
					onCreateStatus={ctx.onCreateStatus}
					onDeleteStatus={ctx.onDeleteStatus}
				/>
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
