import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import {
	ClockCounterClockwiseIcon,
	CrownIcon,
} from "@phosphor-icons/react/ssr";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { toNodeSlug } from "@/ui/nodes/node-slug";
import {
	useRestoreTreeVersion,
	useTreeVersions,
} from "@/ui/nodes/use-tree-versions";
import { PremiumUpsellNotice } from "@/ui/premium/PremiumUpsellNotice";
import { usePremiumStatus } from "@/ui/premium/use-premium";

// Dynamically imported (rather than a static import above) because it pulls
// in react-diff-viewer-continued, which is sizable and only ever needed once
// someone actually opens history — most page loads shouldn't pay for it.
const NodeVersionHistoryDialog = lazy(() =>
	import(
		"@cascade/outliner/features/version-history/node-version-history-dialog"
	).then((mod) => ({ default: mod.NodeVersionHistoryDialog })),
);

/**
 * Entry point for tree-wide version history: a header button that opens a
 * dialog listing recent content edits across every node in the tree (not
 * just the one currently open), each linking back to its node. Reuses the
 * same dialog chrome and premium gate as the per-node history
 * (`VersionHistoryModal`) via `NodeVersionHistoryDialog`'s optional
 * node-link column.
 */
export function TreeVersionHistory() {
	const [open, setOpen] = useState(false);
	// The dialog (and the diff-viewer chunk it lazily pulls in) is only ever
	// mounted starting from the first time it's opened, not on every page
	// load — once true this never goes back to false, so closing/reopening
	// afterward doesn't re-trigger the import.
	const [hasOpened, setHasOpened] = useState(false);
	const { data: premiumStatus } = usePremiumStatus();
	const isPremium = premiumStatus?.isPremium ?? false;
	const versions = useTreeVersions(open && isPremium);
	const { restore, restoringId } = useRestoreTreeVersion();

	return (
		<>
			<button
				type="button"
				className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-ink/15 px-2.5 py-1 text-xs font-medium text-muted outline-none hover:border-ink/30 hover:text-ink focus-visible:ring-2 focus-visible:ring-danger/50 dark:border-surface/15 dark:text-surface/70 dark:hover:border-surface/30 dark:hover:text-surface"
				onClick={() => {
					setOpen(true);
					setHasOpened(true);
				}}
			>
				<ClockCounterClockwiseIcon size={12} weight="bold" />
				{m.outliner_tree_version_history_trigger()}
				{!isPremium && (
					<CrownIcon size={11} weight="fill" className="text-primary" />
				)}
			</button>
			{hasOpened && (
				<Suspense fallback={null}>
					<NodeVersionHistoryDialog
						open={open}
						onOpenChange={setOpen}
						title={m.outliner_tree_version_history()}
						closeAriaLabel={m.outliner_tree_version_history_close_aria()}
						emptyLabel={m.outliner_tree_version_history_empty()}
						locked={
							premiumStatus !== undefined && !isPremium ? (
								<PremiumUpsellNotice
									description={m.premium_gate_tree_version_history_description()}
								/>
							) : undefined
						}
						versions={versions}
						onRestore={restore}
						restoringId={restoringId}
						renderNodeLink={(node) => (
							<Link
								to="/$nodeSlug"
								params={{ nodeSlug: toNodeSlug(node) }}
								search={true}
								className="text-danger underline decoration-danger/40 underline-offset-2 hover:decoration-danger dark:text-accent dark:decoration-accent/40 dark:hover:decoration-accent"
							>
								{lexicalToPlainText(node.content) || m.breadcrumbs_untitled()}
							</Link>
						)}
					/>
				</Suspense>
			)}
		</>
	);
}
