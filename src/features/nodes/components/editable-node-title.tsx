import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { orpc } from "#/orpc/client";
import { useInlineEdit } from "#/ui/hooks/use-inline-edit";
import type { NodeType, NodeWithMeta } from "../schema";

export function EditableNodeTitle({
	nodeId,
	text,
	parentId,
}: {
	nodeId: string;
	text: string;
	parentId: string | null;
}) {
	const queryClient = useQueryClient();
	const [isEditing, setIsEditing] = useState(false);
	const [clickAt, setClickAt] = useState<{ x: number; y: number } | undefined>();
	const { mutate: updateNode } = useMutation(orpc.updateNode.mutationOptions());

	const nodeQueryOptions = orpc.getNode.queryOptions({ input: { id: nodeId } });
	const parentQueryOptions = parentId
		? orpc.getChildren.queryOptions({ input: { parentId } })
		: orpc.listNodes.queryOptions();

	const { mountRef, handleKeyDown, handleBlur } = useInlineEdit({
		clickAt,
		onSave: (value) => {
			const trimmed = value.trim();
			if (trimmed && trimmed !== text) {
				queryClient.setQueryData(
					nodeQueryOptions.queryKey,
					(old: (NodeType & { children: NodeWithMeta[] }) | undefined) =>
						old ? { ...old, text: trimmed } : old,
				);
				queryClient.setQueryData(
					parentQueryOptions.queryKey,
					(old: NodeWithMeta[] | undefined) =>
						old?.map((n) => (n.id === nodeId ? { ...n, text: trimmed } : n)),
				);
				updateNode(
					{ id: nodeId, text: trimmed },
					{
						onSettled: () => {
							queryClient.invalidateQueries(nodeQueryOptions);
							queryClient.invalidateQueries(parentQueryOptions);
						},
					},
				);
			}
			setIsEditing(false);
		},
		onCancel: () => setIsEditing(false),
	});

	if (!isEditing) {
		return (
			// biome-ignore lint/a11y/useSemanticElements: div is used and interaction
			<div
				className="text-xl font-semibold mb-4 inline-flex cursor-text"
				style={{ viewTransitionName: `node-text-${nodeId}` }}
				role="button"
				tabIndex={0}
				onClick={(e) => {
					setClickAt({ x: e.clientX, y: e.clientY });
					setIsEditing(true);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") setIsEditing(true);
				}}
			>
				{text}
			</div>
		);
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: contenteditable is interactive
		<div
			ref={mountRef}
			contentEditable
			suppressContentEditableWarning
			className="text-xl font-semibold mb-4 outline-none"
			style={{ viewTransitionName: `node-text-${nodeId}` }}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
		>
			{text}
		</div>
	);
}
