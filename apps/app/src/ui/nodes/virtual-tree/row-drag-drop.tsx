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
import { sound } from "@/lib/sound";
import { createDragPreview } from "@/ui/nodes/drag-animation/drag-preview";
import { nodeRowDomAttributes } from "@/ui/nodes/drag-animation/node-rows";
import { NodeDragHandle } from "@/ui/nodes/node-drag-handle";
import { NodeDropIndicator } from "@/ui/nodes/node-drop-indicator";
import type { ActiveDragPreview } from "@/ui/nodes/virtual-tree/virtual-tree";
import {
	type MoveTarget,
	subtreeRange,
} from "@/ui/nodes/virtual-tree/visible-rows";
import { useSettings } from "@/ui/settings-context";

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
	const { settings } = useSettings();

	const latest = useRef({
		row,
		rows,
		onMoveDrop,
		indentSize: settings.indentSize,
	});
	latest.current = { row, rows, onMoveDrop, indentSize: settings.indentSize };

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
					sound.play("pickup");
					const { clientX, clientY } = location.current.input;
					const range = subtreeRange(latest.current.rows, id);
					const descendantIds = range
						? latest.current.rows
								.slice(range.start + 1, range.end)
								.map((r) => r.id)
						: [];
					previewRef.current = {
						nodeId: id,
						preview: createDragPreview(
							rowElement,
							{ x: clientX, y: clientY },
							descendantIds,
						),
					};
				},
				onDrag: ({ location }) => {
					const { clientX, clientY } = location.current.input;
					previewRef.current?.preview.follow({ x: clientX, y: clientY });
				},
				onDrop: () => {
					queueMicrotask(() => {
						previewRef.current?.preview.cancel();
						previewRef.current = null;
					});
				},
			}),
			dropTargetForElements({
				element: rowElement,
				canDrop: ({ source }) => {
					const dragged = (source.data as DragData).nodeId;
					return !isInSubtree(latest.current.rows, dragged, id);
				},
				getData: ({ input, element }) => {
					const { row: current, indentSize } = latest.current;
					return attachInstruction(
						{ nodeId: id },
						{
							input,
							element,
							currentLevel: current.depth,
							indentPerLevel: indentSize,
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

					sound.play("drop");
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
			className="group/node py-1 flex items-center gap-2 relative rounded-md transition-colors duration-150 has-data-popup-open:bg-peach/25 has-data-popup-open:ring-1 has-data-popup-open:ring-inset has-data-popup-open:ring-peach/60"
		>
			<div style={{ paddingLeft: row.depth * settings.indentSize }} />
			<NodeDropIndicator instruction={instruction} />
			<NodeDragHandle ref={handleRef} />
			{children}
		</div>
	);
}
