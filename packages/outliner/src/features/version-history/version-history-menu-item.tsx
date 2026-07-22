import { ContextMenuItem } from "@cascade/ui/context-menu";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/ssr";
import { useOutlinerLabels } from "../../labels-context";
import type { VersionHistoryFeatureContext } from "./index";

export function VersionHistoryMenuItem({
	ctx,
}: {
	ctx: VersionHistoryFeatureContext;
}) {
	const labels = useOutlinerLabels();
	if (!ctx.onOpenVersionHistory) return null;
	return (
		<ContextMenuItem
			icon={<ClockCounterClockwiseIcon size={14} weight="bold" />}
			onClick={() => ctx.onOpenVersionHistory?.(ctx.row.id)}
		>
			{labels.versionHistory}
		</ContextMenuItem>
	);
}
