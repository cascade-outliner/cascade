"use no memo";

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
import {
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import type { VisibleNodeRow } from "@/core/nodes/node.types";
import { createDragPreview } from "@/ui/nodes/drag-animation/drag-preview";
import { nodeRowDomAttributes } from "@/ui/nodes/drag-animation/node-rows";
import { NodeDragHandle } from "@/ui/nodes/node-drag-handle";
import { NodeDropIndicator } from "@/ui/nodes/node-drop-indicator";
import type { ActiveDragPreview } from "@/ui/nodes/virtual-tree/virtual-tree";
import {
	type MoveTarget,
	subtreeRange,
} from "@/ui/nodes/virtual-tree/visible-rows";

export const INDENT_PER_LEVEL = 16;

interface RowDragAndDropProps {
	row: VisibleNodeRow;
	rows: VisibleNodeRow[];
	onMoveDrop: (draggedId: string, target: MoveTarget) => void;
	previewRef: RefObject<ActiveDragPreview | null>;
	children: ReactNode;
}

type DragData = Record<string, unknown> & {
	nodeId: string;
};

/** True when `id` is `sourceId` itself or a visible descendant of it. */
function isInSubtree(rows: VisibleNodeRow[], sourceId: string, id: string) {
	if (sourceId === id) return true;
	const range = subtreeRange(rows, sourceId);
	if (!range) return false;
	for (let i = range.start + 1; i < range.end; i++) {
		if (rows[i].id === id) return true;
	}
	return false;
}

export function RowDragAndDrop({
	row,
	rows,
	onMoveDrop,
	previewRef,
	children,
}: RowDragAndDropProps) {
	const rowRef = useRef<HTMLDivElement>(null);
	const handleRef = useRef<HTMLButtonElement>(null);
	const [instruction, setInstruction] = useState<Instruction | null>(null);

	// DnD callbacks read the latest props through this ref so registration
	// survives cache splices without tearing down listeners on every render.
	const latest = useRef({ row, rows, onMoveDrop });
	latest.current = { row, rows, onMoveDrop };

	useEffect(() => {
		const rowElement = rowRef.current;
		const handle = handleRef.current;
		if (!rowElement || !handle) return;

		const id = latest.current.row.id;

		return combine(
			draggable({
				element: rowElement,
				dragHandle: handle,
				getInitialData: (): DragData => ({ nodeId: id }),
				onGenerateDragPreview: disableNativeDragPreview,
				onDragStart: ({ location }) => {
					const { clientX, clientY } = location.current.input;
					const range = subtreeRange(latest.current.rows, id);
					const descendantCount = range ? range.end - range.start - 1 : 0;
					previewRef.current = {
						nodeId: id,
						preview: createDragPreview(
							rowElement,
							{ x: clientX, y: clientY },
							descendantCount,
						),
					};
				},
				onDrag: ({ location }) => {
					const { clientX, clientY } = location.current.input;
					previewRef.current?.preview.follow({ x: clientX, y: clientY });
				},
				onDrop: ({ location }) => {
					// The drop target's onDrop owns the settle animation; the source
					// only cancels when the drop landed nowhere valid.
					const target = location.current.dropTargets[0];
					const inst = target ? extractInstruction(target.data) : null;
					if (!target || !inst || inst.type === "instruction-blocked") {
						previewRef.current?.preview.cancel();
						previewRef.current = null;
					}
				},
			}),
			dropTargetForElements({
				element: rowElement,
				canDrop: ({ source }) => {
					const dragged = (source.data as DragData).nodeId;
					return !isInSubtree(latest.current.rows, dragged, id);
				},
				getData: ({ input, element }) => {
					const { row: current } = latest.current;
					return attachInstruction(
						{ nodeId: id },
						{
							input,
							element,
							currentLevel: current.depth,
							indentPerLevel: INDENT_PER_LEVEL,
							mode:
								current.expanded && current.hasChildren
									? "expanded"
									: current.isLastChild
										? "last-in-group"
										: "standard",
							block: ["reparent"],
						},
					);
				},
				onDrag: ({ self }) => setInstruction(extractInstruction(self.data)),
				onDragLeave: () => setInstruction(null),
				onDrop: ({ self, source }) => {
					setInstruction(null);
					const dragged = (source.data as DragData).nodeId;
					const inst = extractInstruction(self.data);
					const {
						row: current,
						rows: allRows,
						onMoveDrop: drop,
					} = latest.current;
					if (!inst || inst.type === "instruction-blocked" || dragged === id) {
						return;
					}

					if (inst.type === "reorder-above") {
						drop(dragged, {
							position: "before",
							targetId: id,
							parentId: current.parentId,
						});
					} else if (inst.type === "reorder-below") {
						const index = allRows.findIndex((r) => r.id === id);
						const firstChild = allRows[index + 1];
						if (
							current.expanded &&
							current.hasChildren &&
							firstChild?.parentId === id
						) {
							// Dropping below an expanded parent means "first child".
							drop(dragged, {
								position: "before",
								targetId: firstChild.id,
								parentId: id,
							});
						} else {
							drop(dragged, {
								position: "after",
								targetId: id,
								parentId: current.parentId,
							});
						}
					} else if (inst.type === "make-child") {
						drop(dragged, { position: "append", parentId: id });
					}
				},
			}),
		);
	}, [previewRef]);

	return (
		<div
			ref={rowRef}
			{...nodeRowDomAttributes(row.id)}
			className="group/node py-1 flex items-center gap-2 relative bg-ginger"
		>
			<NodeDropIndicator instruction={instruction} />
			<NodeDragHandle ref={handleRef} />
			{children}
		</div>
	);
}
