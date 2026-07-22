import type { QueryKey } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { m } from "#/paraglide/messages.js";
import {
	useNodeVersions,
	useRestoreNodeVersion,
} from "@/ui/nodes/use-node-versions";
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

/** Wraps the framework-agnostic `NodeVersionHistoryDialog` with this app's
 * oRPC data fetching/mutation, so `NodeTree`/`RootTree` only need to track
 * which node's history is open. `treeQueryKey` is the same `visibleTree`
 * query key the open node's row lives in, so a restore can patch it in
 * place (see `useRestoreNodeVersion`).
 *
 * Version history is a premium feature (`requirePremium` gates the
 * `listVersions`/`restoreVersion` procedures server-side too): non-premium
 * viewers get the dialog's normal chrome but an upsell in place of the
 * version list, via `NodeVersionHistoryDialog`'s generic `locked` slot. */
export function VersionHistoryModal({
	nodeId,
	onOpenChange,
	treeQueryKey,
}: {
	nodeId: string | null;
	onOpenChange: (open: boolean) => void;
	treeQueryKey: QueryKey;
}) {
	const { data: premiumStatus } = usePremiumStatus();
	const isPremium = premiumStatus?.isPremium ?? false;
	const versions = useNodeVersions(isPremium ? nodeId : null);
	const { restore, restoringId } = useRestoreNodeVersion(treeQueryKey);

	// The dialog (and the diff-viewer chunk it lazily pulls in) is only ever
	// mounted starting from the first time it's opened, not on every page
	// load — once true this never goes back to false, so closing/reopening
	// afterward doesn't re-trigger the import.
	const [hasOpened, setHasOpened] = useState(false);
	useEffect(() => {
		if (nodeId !== null) setHasOpened(true);
	}, [nodeId]);
	if (!hasOpened) return null;

	return (
		<Suspense fallback={null}>
			<NodeVersionHistoryDialog
				open={nodeId !== null}
				onOpenChange={onOpenChange}
				locked={
					premiumStatus !== undefined && !isPremium ? (
						<PremiumUpsellNotice
							description={m.premium_gate_version_history_description()}
						/>
					) : undefined
				}
				versions={versions}
				onRestore={(versionId) => {
					if (!nodeId) return;
					const version = versions?.find((v) => v.id === versionId);
					if (!version) return;
					restore(versionId, nodeId, version.content as { root: unknown });
				}}
				restoringId={restoringId}
			/>
		</Suspense>
	);
}
