import { Button } from "@cascade/ui/button";
import {
	ArrowCounterClockwiseIcon,
	CircleNotchIcon,
} from "@phosphor-icons/react/ssr";
import { m } from "#/paraglide/messages.js";
import type { TreeHistorySummary } from "@/features/tree-history/model/tree-history.schema";
import { actionLabel, EventPreview } from "./event-preview";
import { useRestoreTreeHistory, useTreeHistoryDetail } from "./queries";

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

export function TreeHistoryDetailPane({
	selected,
	enabled,
}: {
	selected: TreeHistorySummary | null;
	enabled: boolean;
}) {
	const detail = useTreeHistoryDetail(selected?.id, enabled && !!selected);
	const restore = useRestoreTreeHistory();
	const canRestore =
		detail.data?.restorable === true &&
		(!detail.data.nodeDeleted || detail.data.kind === "subtree_deleted");

	return (
		<div
			className="min-h-0 overflow-auto p-5"
			data-testid="tree-history-detail"
		>
			{detail.isPending || !detail.data ? (
				<div className="flex h-full items-center justify-center">
					<CircleNotchIcon size={24} className="animate-spin" />
				</div>
			) : (
				<div className="flex flex-col gap-5">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<h2 className="font-semibold">{actionLabel(detail.data.kind)}</h2>
							<p className="text-ink/60 text-sm dark:text-surface/60">
								{detail.data.label || m.breadcrumbs_untitled()} ·{" "}
								{timestampFormatter.format(new Date(detail.data.createdAt))}
							</p>
						</div>
						<Button
							type="button"
							size="sm"
							onClick={() => restore.mutate(detail.data.id)}
							disabled={!canRestore || restore.isPending}
						>
							<ArrowCounterClockwiseIcon size={14} />
							{m.tree_history_restore()}
						</Button>
					</div>
					{detail.data.nodeDeleted &&
						detail.data.kind !== "subtree_deleted" && (
							<p className="rounded-md bg-danger/10 p-3 text-danger text-sm">
								{m.tree_history_restore_deletion_first()}
							</p>
						)}
					<EventPreview detail={detail.data} />
				</div>
			)}
		</div>
	);
}
