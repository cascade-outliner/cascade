import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { toLexicalContent } from "@cascade/outliner/lexical-content";
import { NodeCheckbox } from "@cascade/outliner/node-checkbox";
import { VirtualTree } from "@cascade/outliner/virtual-tree";
import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { client, orpc } from "#/orpc/client";
import { GenericErrorComponent } from "#/ui/error/generic-error";
import { Breadcrumbs } from "#/ui/nodes/breadcrumbs";
import { NodeLink } from "#/ui/nodes/node-link";
import {
	useVisibleTree,
	visibleTreeOptions,
} from "#/ui/nodes/virtual-tree/use-visible-tree";
import { useSettings } from "#/ui/settings-context";

export const Route = createFileRoute("/node/$nodeId")({
	loader: ({ context: { queryClient }, params: { nodeId } }) => {
		queryClient.prefetchQuery(visibleTreeOptions(nodeId));
		return Promise.all([
			queryClient.ensureQueryData(
				orpc.nodes.get.queryOptions({ input: { id: nodeId } }),
			),
			queryClient.ensureQueryData(
				orpc.nodes.ancestors.queryOptions({ input: { id: nodeId } }),
			),
		]);
	},
	pendingComponent: CascadeLoader,
	pendingMinMs: 200,
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
		<Suspense fallback={<CascadeLoader />}>
			<NodeTree
				nodeId={nodeId}
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
		</Suspense>
	);
}

function NodeTree({ nodeId, header }: { nodeId: string; header: ReactNode }) {
	const tree = useVisibleTree(nodeId);
	const { settings } = useSettings();
	return (
		<VirtualTree
			tree={tree}
			indentSize={settings.indentSize}
			renderNodeLink={(id) => <NodeLink id={id} />}
			header={header}
			contentClassName="rr-block"
		/>
	);
}
