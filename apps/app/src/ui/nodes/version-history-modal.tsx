import { NodeVersionHistoryDialog } from "@cascade/outliner/features/version-history/node-version-history-dialog";
import type { QueryKey } from "@tanstack/react-query";
import {
	useNodeVersions,
	useRestoreNodeVersion,
} from "@/ui/nodes/use-node-versions";

/** Wraps the framework-agnostic `NodeVersionHistoryDialog` with this app's
 * oRPC data fetching/mutation, so `NodeTree`/`RootTree` only need to track
 * which node's history is open. `treeQueryKey` is the same `visibleTree`
 * query key the open node's row lives in, so a restore can patch it in
 * place (see `useRestoreNodeVersion`). */
export function VersionHistoryModal({
	nodeId,
	onOpenChange,
	treeQueryKey,
}: {
	nodeId: string | null;
	onOpenChange: (open: boolean) => void;
	treeQueryKey: QueryKey;
}) {
	const versions = useNodeVersions(nodeId);
	const { restore, restoringId } = useRestoreNodeVersion(treeQueryKey);

	return (
		<NodeVersionHistoryDialog
			open={nodeId !== null}
			onOpenChange={onOpenChange}
			versions={versions}
			onRestore={(versionId) => {
				if (!nodeId) return;
				const version = versions?.find((v) => v.id === versionId);
				if (!version) return;
				restore(versionId, nodeId, version.content as { root: unknown });
			}}
			restoringId={restoringId}
		/>
	);
}
