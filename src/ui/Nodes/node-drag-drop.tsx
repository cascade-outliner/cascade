import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
	draggable,
	dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { disableNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview";
import {
	attachInstruction,
	extractInstruction,
	type Instruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { NodeType } from "#/core/nodes/node.types";
import { orpc } from "#/orpc/client";
import {
	createDragPreview,
	type DragPreviewHandle,
} from "#/ui/Nodes/drag-animation/drag-preview";
import { animateDropSettle } from "#/ui/Nodes/drag-animation/drop-settle";
import { nodeRowDomAttributes } from "#/ui/Nodes/drag-animation/node-rows";
import { NodeDragHandle } from "#/ui/Nodes/node-drag-handle";
import { NodeDropIndicator } from "#/ui/Nodes/node-drop-indicator";

interface NodeDragAndDropProps
	extends Pick<NodeType, "id" | "parentId" | "expanded" | "hasChildren"> {
	level: number;
	isLastChild: boolean;
	children: ReactNode;
}

type DragData = Record<string, unknown> & {
	nodeId: string;
	parentId: string | null;
};

const INDENT_PER_LEVEL = 16;

export function NodeDragAndDrop({
	id,
	parentId,
	expanded,
	hasChildren,
	level,
	isLastChild,
	children,
}: NodeDragAndDropProps) {
	const queryClient = useQueryClient();
	const rowRef = useRef<HTMLDivElement>(null);
	const handleRef = useRef<HTMLButtonElement>(null);
	const previewRef = useRef<DragPreviewHandle | null>(null);
	const [instruction, setInstruction] = useState<Instruction | null>(null);

	const { mutate: expandNode } = useMutation({
		...orpc.toggleNodeExpanded.mutationOptions(),
		onSuccess: () => {
			queryClient.invalidateQueries(
				orpc.listNodes.queryOptions({ input: { parentId } }),
			);
		},
	});

	const { mutate: moveNode } = useMutation({
		...orpc.moveNode.mutationOptions(),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries(
				orpc.listNodes.queryOptions({ input: { parentId } }),
			);
			queryClient.invalidateQueries(
				orpc.listNodes.queryOptions({
					input: { parentId: variables.parentId },
				}),
			);
		},
	});

	useEffect(() => {
		const row = rowRef.current;
		const handle = handleRef.current;
		if (!row || !handle) return;

		return combine(
			draggable({
				element: row,
				dragHandle: handle,
				getInitialData: (): DragData => ({ nodeId: id, parentId }),
				onGenerateDragPreview: disableNativeDragPreview,
				onDragStart: ({ location }) => {
					const { clientX, clientY } = location.current.input;
					previewRef.current = createDragPreview(row, {
						x: clientX,
						y: clientY,
					});
				},
				onDrag: ({ location }) => {
					const { clientX, clientY } = location.current.input;
					previewRef.current?.follow({ x: clientX, y: clientY });
				},
				onDrop: ({ location }) => {
					const preview = previewRef.current;
					previewRef.current = null;
					if (!preview) return;

					const target = location.current.dropTargets[0];
					const inst = target ? extractInstruction(target.data) : null;
					if (!target || !inst || inst.type === "instruction-blocked") {
						preview.cancel();
						return;
					}
					animateDropSettle(preview, id, row);
				},
			}),
			dropTargetForElements({
				element: row,
				canDrop: ({ source }) => (source.data as DragData).nodeId !== id,
				getData: ({ input, element }) =>
					attachInstruction({ nodeId: id, parentId } satisfies DragData, {
						input,
						element,
						currentLevel: level,
						indentPerLevel: INDENT_PER_LEVEL,
						mode:
							expanded && hasChildren
								? "expanded"
								: isLastChild
									? "last-in-group"
									: "standard",
						block: ["reparent"],
					}),
				onDrag: ({ self }) => setInstruction(extractInstruction(self.data)),
				onDragLeave: () => setInstruction(null),
				onDrop: ({ self, source }) => {
					setInstruction(null);
					const dragged = source.data as DragData;
					const parsed = extractInstruction(self.data);
					if (!parsed || dragged.nodeId === id) return;

					if (parsed.type === "reorder-above") {
						moveNode({
							id: dragged.nodeId,
							parentId,
							position: "before",
							targetId: id,
						});
					} else if (parsed.type === "reorder-below") {
						moveNode({
							id: dragged.nodeId,
							parentId,
							position: "after",
							targetId: id,
						});
					} else if (parsed.type === "make-child") {
						moveNode({
							id: dragged.nodeId,
							parentId: id,
							position: "append",
							targetId: null,
						});
						if (!expanded) expandNode({ id, expanded: true });
					}
				},
			}),
		);
	}, [
		id,
		parentId,
		expanded,
		hasChildren,
		level,
		isLastChild,
		moveNode,
		expandNode,
	]);

	return (
		<div
			ref={rowRef}
			{...nodeRowDomAttributes(id)}
			className="group/node py-1 flex items-center gap-2 relative"
		>
			<NodeDropIndicator instruction={instruction} />
			<NodeDragHandle ref={handleRef} />
			{children}
		</div>
	);
}
