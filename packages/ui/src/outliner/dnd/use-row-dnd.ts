import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useMemo } from "react";
import type { DragHandleContextValue } from "../context";

export interface RowDnd {
	setNodeRef: (element: HTMLElement | null) => void;
	isDragging: boolean;
	handle: DragHandleContextValue;
}

export function useRowDnd(id: string, depth: number): RowDnd {
	const draggable = useDraggable({ id, data: { depth } });
	const droppable = useDroppable({ id, disabled: draggable.isDragging });
	const setDraggableRef = draggable.setNodeRef;
	const setDroppableRef = droppable.setNodeRef;

	const setNodeRef = useMemo(
		() => (element: HTMLElement | null) => {
			setDraggableRef(element);
			setDroppableRef(element);
		},
		[setDraggableRef, setDroppableRef],
	);

	const handle = useMemo<DragHandleContextValue>(
		() => ({
			attributes: draggable.attributes,
			listeners: draggable.listeners,
			setActivatorNodeRef: draggable.setActivatorNodeRef,
			isDragging: draggable.isDragging,
		}),
		[
			draggable.attributes,
			draggable.listeners,
			draggable.setActivatorNodeRef,
			draggable.isDragging,
		],
	);

	return { setNodeRef, isDragging: draggable.isDragging, handle };
}
