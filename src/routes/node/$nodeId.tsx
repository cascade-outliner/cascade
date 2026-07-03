import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { client, orpc } from "#/orpc/client";
import { GenericErrorComponent } from "#/ui/error/generic-error";
import { toLexicalContent } from "#/ui/lexical/lexical-content";
import { LexicalReadView } from "#/ui/lexical/read/lexical-read-view";
import { Breadcrumbs } from "#/ui/nodes/breadcrumbs";
import { NodeCheckbox } from "#/ui/nodes/node-checkbox";
import { visibleTreeOptions } from "#/ui/nodes/virtual-tree/use-visible-tree";
import { VirtualTree } from "#/ui/nodes/virtual-tree/virtual-tree";

export const Route = createFileRoute("/node/$nodeId")({
	loader: ({ context: { queryClient }, params: { nodeId } }) =>
		Promise.all([
			queryClient.ensureQueryData(
				orpc.nodes.get.queryOptions({ input: { id: nodeId } }),
			),
			queryClient.ensureQueryData(visibleTreeOptions(nodeId)),
			queryClient.ensureQueryData(
				orpc.nodes.ancestors.queryOptions({ input: { id: nodeId } }),
			),
		]),
	errorComponent: GenericErrorComponent,
	component: NodeDetailPage,
});

function NodeDetailPage() {
	const { nodeId } = Route.useParams();
	const queryClient = useQueryClient();
	const options = orpc.nodes.get.queryOptions({ input: { id: nodeId } });
	const { data: node } = useSuspenseQuery(options);

	const toggleTask = async (completed: boolean) => {
		queryClient.setQueryData(options.queryKey, (old) =>
			old ? { ...old, metadata: { completed } } : old,
		);
		try {
			await client.nodes.setType({
				id: nodeId,
				type: "task",
				metadata: { completed },
			});
		} catch {
			queryClient.invalidateQueries({ queryKey: options.queryKey });
		}
	};

	return (
		<VirtualTree
			rootId={nodeId}
			header={
				<>
					<Breadcrumbs nodeId={nodeId} />
					<div
						style={{ viewTransitionName: `node-${nodeId}` }}
						className="text-2xl mb-8 flex items-center gap-3"
					>
						{node.type === "task" && (
							<NodeCheckbox metadata={node.metadata} onToggle={toggleTask} />
						)}
						<LexicalReadView content={toLexicalContent(node.content)} />
					</div>
				</>
			}
		/>
	);
}
