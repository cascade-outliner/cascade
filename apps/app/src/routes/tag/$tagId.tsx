import { HouseIcon } from "@phosphor-icons/react/ssr";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { nodeTypeDefs, type TypedMetadata } from "@/core/nodes/node-types";
import { orpc } from "@/orpc/client";
import { GenericErrorComponent } from "@/ui/error/generic-error";
import type { FocusPoint } from "@/ui/nodes/node-editor";
import { TagFilteredNodeRow } from "@/ui/tags/tag-filtered-node-row";
import { useTagFilteredNodes } from "@/ui/tags/use-tag-filtered-nodes";

export const Route = createFileRoute("/tag/$tagId")({
	loader: ({ context: { queryClient }, params: { tagId } }) =>
		Promise.all([
			queryClient.ensureQueryData(
				orpc.tags.get.queryOptions({ input: { id: tagId } }),
			),
			queryClient.ensureQueryData(
				orpc.tags.nodesForTag.queryOptions({ input: { tagId, cursor: null } }),
			),
		]),
	errorComponent: GenericErrorComponent,
	component: TagFilterPage,
});

function TagFilterPage() {
	const { tagId } = Route.useParams();
	const { data: tag } = useSuspenseQuery(
		orpc.tags.get.queryOptions({ input: { id: tagId } }),
	);
	const tree = useTagFilteredNodes(tagId);
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
	const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);

	return (
		<div className="max-w-6xl mx-auto px-4 py-12 sm:py-32">
			<nav aria-label="Breadcrumb" className="mb-4 text-sm">
				<Link
					to="/"
					viewTransition
					aria-label="Home"
					className="hover:text-redleather transition-colors"
				>
					<HouseIcon size={16} weight="bold" />
				</Link>
			</nav>
			<div className="text-2xl mb-8 flex items-center gap-3">
				<span
					aria-hidden
					className="block size-4 rounded-full shrink-0"
					style={{ backgroundColor: tag.color }}
				/>
				{tag.name}
			</div>
			{tree.rows.length === 0 ? (
				<p className="text-sm py-4">
					No nodes are tagged with &quot;{tag.name}&quot; yet.
				</p>
			) : (
				<div>
					{tree.rows.map((row) => (
						<TagFilteredNodeRow
							key={row.id}
							row={row}
							editing={editingNodeId === row.id}
							focusPoint={editingNodeId === row.id ? focusPoint : null}
							onStartEdit={(point) => {
								setEditingNodeId(row.id);
								setFocusPoint(point ?? null);
							}}
							onExitEdit={() =>
								setEditingNodeId((current) =>
									current === row.id ? null : current,
								)
							}
							onSaveContent={(content) => tree.updateContent(row.id, content)}
							onConvert={(type) =>
								tree.setType(row.id, {
									type,
									metadata: nodeTypeDefs[type].defaultMetadata,
								} as TypedMetadata)
							}
							onToggleTask={(completed) =>
								tree.setType(row.id, { type: "task", metadata: { completed } })
							}
							onDelete={() => tree.remove(row.id)}
							onAddTag={(tag) => tree.addTag(row.id, tag)}
							onRemoveTag={(removedTagId) =>
								tree.removeTag(row.id, removedTagId)
							}
						/>
					))}
				</div>
			)}
			{tree.hasMore && (
				<button
					type="button"
					onClick={() => tree.loadMore()}
					className="mt-4 text-sm underline outline-none focus-visible:ring-2 focus-visible:ring-redleather/50"
				>
					Load more
				</button>
			)}
		</div>
	);
}
