import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { orpc } from "#/orpc/client";
import { EditableNodeTitle } from "../components/editable-node-title";
import { NodeTree } from "../components/node-tree";

export const nodeDetailLoader = async ({
	context,
	params,
}: {
	context: { queryClient: QueryClient };
	params: { nodeId: string };
}) => {
	await context.queryClient.ensureQueryData(
		orpc.getNode.queryOptions({ input: { id: params.nodeId } }),
	);
};

export function NodeDetailPage() {
	const { nodeId } = useParams({ from: "/node/$nodeId" });
	const { data } = useSuspenseQuery(
		orpc.getNode.queryOptions({ input: { id: nodeId } }),
	);

	return (
		<div className="max-w-6xl mx-auto py-10">
			<EditableNodeTitle
				nodeId={nodeId}
				text={data.text}
				parentId={data.parentId}
			/>
			<NodeTree roots={data.children} withTransition />
		</div>
	);
}
