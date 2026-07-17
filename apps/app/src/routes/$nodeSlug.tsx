import { getRowVisibility } from "@cascade/outliner/filter-visibility";
import { FiltersBar } from "@cascade/outliner/filters-bar";
import { LexicalReadView } from "@cascade/outliner/lexical/read/lexical-read-view";
import { toLexicalContent } from "@cascade/outliner/lexical-content";
import { NodeCheckbox } from "@cascade/outliner/node-checkbox";
import { NodeDueDatePill } from "@cascade/outliner/node-due-date-pill";
import { NodeTagsControl } from "@cascade/outliner/node-tags-pills";
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
import {
	existingTagsOptions,
	useDeleteTag,
	useExistingTags,
} from "#/ui/nodes/use-existing-tags";
import { useNodeFilters } from "#/ui/nodes/use-node-filters";
import { useOptimisticNodeMutation } from "#/ui/nodes/use-optimistic-node-mutation";
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
		queryClient.prefetchQuery(existingTagsOptions());
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

type NodeDetailData = Awaited<ReturnType<typeof client.nodes.get>>;

function NodeDetailPage() {
	const { nodeId } = Route.useLoaderData();
	const queryClient = useQueryClient();
	const options = orpc.nodes.get.queryOptions({ input: { id: nodeId } });
	const { data: node } = useSuspenseQuery(options);
	const existingTags = useExistingTags();
	const deleteTag = useDeleteTag();

	const toggleTaskMutation = useOptimisticNodeMutation<
		boolean,
		void,
		NodeDetailData
	>({
		queryKey: options.queryKey,
		mutationFn: (completed) =>
			client.nodes.setType({
				id: nodeId,
				type: "task",
				metadata: { completed },
			}),
		patch: (old, completed) =>
			old ? { ...old, metadata: { completed } } : old,
	});
	const toggleTask = (completed: boolean) =>
		toggleTaskMutation.mutate(completed);

	const setDueDateMutation = useOptimisticNodeMutation<
		Date | null,
		void,
		NodeDetailData
	>({
		queryKey: options.queryKey,
		mutationFn: (dueDate) => client.nodes.setDueDate({ id: nodeId, dueDate }),
		patch: (old, dueDate) => (old ? { ...old, dueDate } : old),
	});
	const setDueDate = (dueDate: Date | null) =>
		setDueDateMutation.mutate(dueDate);

	const setTagsMutation = useOptimisticNodeMutation<
		string[],
		void,
		NodeDetailData
	>({
		queryKey: options.queryKey,
		mutationFn: (tags) => client.nodes.setTags({ id: nodeId, tags }),
		patch: (old, tags) => (old ? { ...old, tags } : old),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: existingTagsOptions().queryKey,
			}),
	});
	const setTags = (tags: string[]) => setTagsMutation.mutate(tags);

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
							className="group/node text-2xl mb-8 flex flex-col gap-3"
						>
							<div className="flex gap-3 items-center">
								{node.type === "task" && (
									<NodeCheckbox
										metadata={node.metadata}
										onToggle={toggleTask}
									/>
								)}
								<LexicalReadView content={toLexicalContent(node.content)} />
							</div>

							<div className="flex items-start gap-1">
								{dueDate && (
									<NodeDueDatePill
										dueDate={dueDate}
										completed={completed}
										onChange={setDueDate}
									/>
								)}
								<NodeTagsControl
									tags={node.tags}
									existingTags={existingTags}
									onChange={setTags}
									onDeleteTag={deleteTag}
								/>
							</div>
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
	const visibility = getRowVisibility(tree.rows, filters);
	const existingTags = useExistingTags();
	const deleteTag = useDeleteTag();

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
			existingTags={existingTags}
			onDeleteTag={deleteTag}
		/>
	);
}
