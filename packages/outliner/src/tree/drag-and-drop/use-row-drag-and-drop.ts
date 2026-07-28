import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
	draggable,
	dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
	attachInstruction,
	extractInstruction,
	type Instruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import { outlineRowDropConfirmation } from "@cascade/ui/motion-row-lifecycle";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { VisibleNodeRow } from "../../nodes/model/node-types";
import { moveWouldChangePosition } from "../rows/move-subtree";
import type { MoveTarget } from "../rows/move-targets";
import { isInSubtree, resolveDropTarget } from "./resolve-drop-target";

interface UseRowDragAndDropOptions {
	row: VisibleNodeRow;
	rows: VisibleNodeRow[];
	indentSize: number;
	onMoveDrop: (draggedId: string, target: MoveTarget) => Promise<boolean>;
}

type DragData = Record<string, unknown> & {
	nodeId: string;
};

const mountedDragRows = new Map<string, HTMLElement>();

export function useRowDragAndDrop(options: UseRowDragAndDropOptions) {
	const rowRef = useRef<HTMLDivElement>(null);
	const handleRef = useRef<HTMLButtonElement>(null);
	const [instruction, setInstruction] = useState<Instruction | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const latest = useRef(options);

	useLayoutEffect(() => {
		latest.current = options;
	});

	useEffect(() => {
		const rowElement = rowRef.current;
		const handle = handleRef.current;
		if (!rowElement || !handle) return;

		const id = latest.current.row.id;
		mountedDragRows.set(id, rowElement);
		const cleanup = combine(
			draggable({
				element: handle,
				getInitialData: (): DragData => ({ nodeId: id }),
				onGenerateDragPreview: ({ nativeSetDragImage }) => {
					setCustomNativeDragPreview({
						nativeSetDragImage,
						render: ({ container }) => {
							const preview = rowElement.cloneNode(true) as HTMLElement;
							preview.style.width = `${rowElement.offsetWidth}px`;
							container.append(preview);
							return () => preview.remove();
						},
					});
				},
				onDragStart: () => setIsDragging(true),
				onDrop: () => setIsDragging(false),
			}),
			dropTargetForElements({
				element: rowElement,
				canDrop: ({ source }) => {
					const draggedId = (source.data as DragData).nodeId;
					return !isInSubtree(latest.current.rows, draggedId, id);
				},
				getData: ({ input, element }) => {
					const { row, indentSize } = latest.current;
					return attachInstruction(
						{ nodeId: id },
						{
							input,
							element,
							currentLevel: row.depth,
							indentPerLevel: indentSize,
							mode: getInstructionMode(row),
							block: ["reparent"],
						},
					);
				},
				onDrag: ({ self }) => setInstruction(extractInstruction(self.data)),
				onDragLeave: () => setInstruction(null),
				onDrop: ({ self, source }) => {
					setInstruction(null);

					const draggedId = (source.data as DragData).nodeId;
					const dropInstruction = extractInstruction(self.data);
					const { row, rows, onMoveDrop } = latest.current;
					if (!dropInstruction || draggedId === id) return;

					const target = resolveDropTarget(dropInstruction, row, rows);
					if (!target || !moveWouldChangePosition(rows, draggedId, target)) {
						return;
					}

					void Promise.resolve(onMoveDrop(draggedId, target)).then(
						(succeeded) => {
							const movedRow = mountedDragRows.get(draggedId);
							if (succeeded !== false && movedRow) {
								outlineRowDropConfirmation(movedRow);
							}
						},
					);
				},
			}),
		);
		return () => {
			cleanup();
			if (mountedDragRows.get(id) === rowElement) mountedDragRows.delete(id);
		};
	}, []);

	return { rowRef, handleRef, instruction, isDragging };
}

function getInstructionMode(row: VisibleNodeRow) {
	if (row.expanded && row.hasChildren) return "expanded";
	return row.isLastChild ? "last-in-group" : "standard";
}
