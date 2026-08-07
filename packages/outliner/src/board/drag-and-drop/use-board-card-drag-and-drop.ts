import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
	draggable,
	dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
	attachClosestEdge,
	type Edge,
	extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type BoardCardEdge = Extract<Edge, "top" | "bottom">;

interface UseBoardCardDragAndDropOptions {
	cardId: string;
	columnStatusId: string | null;
	/** While the card's title is being edited, dragging is disabled so
	 * selecting/dragging text inside the editor doesn't fight with the
	 * card's own native drag (see #455 follow-up). */
	editing: boolean;
	/** Called when another card is dropped on this one, above (`"top"`) or
	 * below (`"bottom"`) it, into this card's column. */
	onCardDrop: (
		draggedId: string,
		edge: BoardCardEdge,
		overCardId: string,
		columnStatusId: string | null,
	) => void;
}

type DragData = Record<string, unknown> & { nodeId: string };

export function useBoardCardDragAndDrop({
	cardId,
	columnStatusId,
	editing,
	onCardDrop,
}: UseBoardCardDragAndDropOptions) {
	const cardRef = useRef<HTMLDivElement>(null);
	// A dedicated drag handle (see #455 follow-up), not the whole card, is
	// draggable — mirroring the tree row's own handle/row split — so the
	// rest of the card stays available for tapping to edit and for the
	// row's own context menu on touch devices instead of both fighting the
	// card's native drag.
	const handleRef = useRef<HTMLButtonElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [closestEdge, setClosestEdge] = useState<BoardCardEdge | null>(null);
	const latest = useRef({ cardId, columnStatusId, editing, onCardDrop });

	useLayoutEffect(() => {
		latest.current = { cardId, columnStatusId, editing, onCardDrop };
	});

	useEffect(() => {
		const element = cardRef.current;
		const handle = handleRef.current;
		if (!element || !handle) return;

		const cleanup = combine(
			draggable({
				element: handle,
				canDrag: () => !latest.current.editing,
				getInitialData: (): DragData => ({ nodeId: latest.current.cardId }),
				onGenerateDragPreview: ({ nativeSetDragImage }) => {
					setCustomNativeDragPreview({
						nativeSetDragImage,
						render: ({ container }) => {
							const preview = element.cloneNode(true) as HTMLElement;
							preview.style.width = `${element.offsetWidth}px`;
							container.append(preview);
							return () => preview.remove();
						},
					});
				},
				onDragStart: () => setIsDragging(true),
				onDrop: () => setIsDragging(false),
			}),
			dropTargetForElements({
				element,
				canDrop: ({ source }) =>
					(source.data as DragData).nodeId !== latest.current.cardId,
				getData: ({ input, element: dropElement }) =>
					attachClosestEdge(
						{ nodeId: latest.current.cardId },
						{ input, element: dropElement, allowedEdges: ["top", "bottom"] },
					),
				onDrag: ({ self }) => {
					const edge = extractClosestEdge(self.data);
					setClosestEdge(edge === "top" || edge === "bottom" ? edge : null);
				},
				onDragLeave: () => setClosestEdge(null),
				onDrop: ({ self, source }) => {
					setClosestEdge(null);
					const draggedId = (source.data as DragData).nodeId;
					const edge = extractClosestEdge(self.data);
					const {
						cardId: overCardId,
						columnStatusId: statusId,
						onCardDrop: drop,
					} = latest.current;
					if (
						draggedId === overCardId ||
						(edge !== "top" && edge !== "bottom")
					) {
						return;
					}
					drop(draggedId, edge, overCardId, statusId);
				},
			}),
		);
		return cleanup;
	}, []);

	return { cardRef, handleRef, isDragging, closestEdge };
}
