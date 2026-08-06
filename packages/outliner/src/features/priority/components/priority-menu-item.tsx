import {
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@cascade/ui/context-menu";
import { FlagIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../../i18n/outliner-labels-context";
import type { PriorityFeatureContext } from "../priority-feature";
import { PriorityEditor } from "./priority-editor";

export function PriorityMenuItem({ ctx }: { ctx: PriorityFeatureContext }) {
	const labels = useOutlinerLabels();
	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger
				icon={<FlagIcon size={14} weight="bold" />}
				openOnHover
				delay={150}
			>
				{ctx.priority ? labels.changePriority : labels.setPriority}
			</ContextMenuSubTrigger>
			<ContextMenuSubContent>
				<PriorityEditor priority={ctx.priority} onChange={ctx.onSetPriority} />
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}
