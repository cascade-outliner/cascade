import { NodeContentPreview } from "@cascade/outliner/features/version-history/node-content-preview";
import { CircleNotchIcon } from "@phosphor-icons/react/ssr";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/orpc/client";

/** Wraps the framework-agnostic `NodeContentPreview` with this app's oRPC
 * data fetching, so `NodeVersionHistoryDialog`'s `renderDeletedPreview`
 * prop stays a plain synchronous render callback. Fetches lazily — only
 * once a `descendantsDeleted` marker entry is actually selected — since
 * most dialog opens never touch a deleted entry. */
export function DeletedSubtreePreview({ nodeId }: { nodeId: string }) {
	const { data, isLoading } = useQuery(
		orpc.nodes.deletedSubtreePreview.queryOptions({ input: { nodeId } }),
	);

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center p-4">
				<CircleNotchIcon
					size={20}
					className="animate-spin text-danger dark:text-accent"
				/>
			</div>
		);
	}

	return <NodeContentPreview rows={data} />;
}
