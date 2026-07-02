import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "@/orpc/client";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import { toLexicalContent } from "@/ui/lexical/lexical-content";
import { LexicalReadView } from "@/ui/lexical/read/lexical-read-view";
import { visibleTreeOptions } from "@/ui/nodes/virtual-tree/use-visible-tree";
import { VirtualTree } from "@/ui/nodes/virtual-tree/virtual-tree";

export const Route = createFileRoute("/node/$nodeId")({
	loader: ({ context: { queryClient }, params: { nodeId } }) =>
		Promise.all([
			queryClient.ensureQueryData(
				orpc.nodes.get.queryOptions({ input: { id: nodeId } }),
			),
			queryClient.ensureQueryData(visibleTreeOptions(nodeId)),
		]),
	errorComponent: GenericErrorComponent,
	component: NodeDetailPage,
});

function NodeDetailPage() {
	const { nodeId } = Route.useParams();
	const { data: node } = useSuspenseQuery(
		orpc.nodes.get.queryOptions({ input: { id: nodeId } }),
	);

	return (
		<VirtualTree
			rootId={nodeId}
			header={
				<div
					style={{ viewTransitionName: `node-${nodeId}` }}
					className="text-2xl mb-8"
				>
					<LexicalReadView content={toLexicalContent(node.content)} />
				</div>
			}
		/>
	);
}
