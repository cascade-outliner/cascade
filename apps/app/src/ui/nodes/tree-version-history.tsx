import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { DeletedSubtreePreview } from "@/ui/nodes/deleted-subtree-preview";
import { toNodeSlug } from "@/ui/nodes/node-slug";
import {
	useRestoreTreeVersion,
	useTreeVersions,
} from "@/ui/nodes/use-tree-versions";
import { PremiumUpsellNotice } from "@/ui/premium/PremiumUpsellNotice";
import { usePremiumStatus } from "@/ui/premium/use-premium";

// Dynamically imported (rather than a static import above) since it's only
// ever needed once someone actually opens history — most page loads
// shouldn't pay for it.
const NodeVersionHistoryDialog = lazy(() =>
	import(
		"@cascade/outliner/features/version-history/node-version-history-dialog"
	).then((mod) => ({ default: mod.NodeVersionHistoryDialog })),
);

/**
 * Tree-wide version history: a dialog listing recent content edits across
 * every node in the tree (not just one), each linking back to its node.
 * Opened from the user menu (see `UserMenuTrigger`); reuses the same dialog
 * chrome and premium gate as the per-node history (`VersionHistoryModal`)
 * via `NodeVersionHistoryDialog`'s optional node-link column.
 */
export function TreeVersionHistoryModal({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	// The dialog (and the diff-viewer chunk it lazily pulls in) is only ever
	// mounted starting from the first time it's opened, not on every page
	// load — once true this never goes back to false, so closing/reopening
	// afterward doesn't re-trigger the import.
	const [hasOpened, setHasOpened] = useState(false);
	useEffect(() => {
		if (open) setHasOpened(true);
	}, [open]);

	const { data: premiumStatus } = usePremiumStatus();
	const isPremium = premiumStatus?.isPremium ?? false;
	const versions = useTreeVersions(open && isPremium);
	const { restore, restoringId } = useRestoreTreeVersion();

	if (!hasOpened) return null;

	return (
		<Suspense fallback={null}>
			<NodeVersionHistoryDialog
				open={open}
				onOpenChange={onOpenChange}
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
						onClick={() => onOpenChange(false)}
						className="text-danger underline decoration-danger/40 underline-offset-2 hover:decoration-danger dark:text-accent dark:decoration-accent/40 dark:hover:decoration-accent"
					>
						{lexicalToPlainText(node.content) || m.breadcrumbs_untitled()}
					</Link>
				)}
				renderDeletedPreview={(version) =>
					version.nodeId ? (
						<DeletedSubtreePreview nodeId={version.nodeId} />
					) : null
				}
			/>
		</Suspense>
	);
}
