import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { toLexicalContent } from "@cascade/outliner/lexical-content";
import { NodeCheckbox } from "@cascade/outliner/node-checkbox";
import { NodeDueDatePill } from "@cascade/outliner/node-due-date-pill";
import type { NodeMetadataOf } from "@cascade/outliner/node-types";
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
import { splitNodeSlug } from "#/ui/nodes/node-slug";
import { useNodeFilters } from "#/ui/nodes/use-node-filters";
import { useDueTodayReveal } from "#/ui/nodes/virtual-tree/use-due-today-reveal";
import {
	useVisibleTree,
	visibleTreeOptions,
} from "#/ui/nodes/virtual-tree/use-visible-tree";
import { useSettings } from "#/ui/settings-context";

export const Route = createFileRoute("/$nodeSlug")({
	loader: async ({ context: { queryClient }, params: { nodeSlug } }) => {
		const { slugId, slugText } = splitNodeSlug(nodeSlug);
		const { id: nodeId } = await queryClient.ensureQueryData(
			orpc.nodes.resolveSlug.queryOptions({ input: { slugId, slugText } }),
		);
		queryClient.prefetchQuery(visibleTreeOptions(nodeId));
		await Promise.all([
			queryClient.ensureQueryData(
				orpc.nodes.get.queryOptions({ input: { id: nodeId } }),
			),
			queryClient.ensureQueryData(
				orpc.nodes.ancestors.queryOptions({ input: { id: nodeId } }),
			),
		]);
		return { nodeId };
	},
	pendingComponent: CascadeLoader,
	pendingMinMs: 200,
	errorComponent: GenericErrorComponent,
	component: NodeDetailPage,
});

function NodeDetailPage() {
	const { nodeId } = Route.useLoaderData();
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

	const setDueDate = async (dueDate: Date | null) => {
		queryClient.setQueryData(options.queryKey, (old) =>
			old ? { ...old, dueDate } : old,
		);
		try {
			await client.nodes.setDueDate({ id: nodeId, dueDate });
		} catch {
			queryClient.invalidateQueries({ queryKey: options.queryKey });
		}
	};

	// SSR hydration round-trips the query cache through JSON, which leaves
	// dueDate as an ISO string instead of a Date; normalize it here so
	// NodeDueDatePill always gets a real Date | null (see virtual-tree-row.tsx).
	const dueDate = node.dueDate ? new Date(node.dueDate) : null;
	const completed =
		node.type === "task" &&
		((node.metadata as NodeMetadataOf<"task"> | null)?.completed ?? false);

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
							{dueDate && (
								<NodeDueDatePill
									dueDate={dueDate}
									completed={completed}
									onChange={setDueDate}
								/>
							)}
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
	const [filters, setFilters] = useNodeFilters();
	useDueTodayReveal(nodeId, filters.dueToday);
	const visibility = getRowVisibility(tree.rows, filters);

	return (
		<VirtualTree
			tree={tree}
			indentSize={settings.indentSize}
			renderNodeLink={(node) => (
				<NodeLink id={node.id} content={node.content} />
			)}
			header={
				<>
					{header}
					<FiltersBar filters={filters} onFiltersChange={setFilters} />
				</>
			}
			hiddenRowIds={visibility.hiddenIds}
			contextRowIds={visibility.contextIds}
			newNodeDueDate={filters.dueToday ? new Date() : undefined}
		/>
	);
}
