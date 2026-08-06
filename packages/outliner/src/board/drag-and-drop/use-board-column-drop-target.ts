import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface UseBoardColumnDropTargetOptions {
	columnStatusId: string | null;
	/** Called on a drop that lands in the column's empty space rather than on
	 * a specific card (an already-nested card drop target handles that case
	 * and this callback is skipped, see the `dropTargets` length check). */
	onColumnDrop: (draggedId: string, columnStatusId: string | null) => void;
}

type DragData = Record<string, unknown> & { nodeId: string };

export function useBoardColumnDropTarget({
	columnStatusId,
	onColumnDrop,
}: UseBoardColumnDropTargetOptions) {
	const columnRef = useRef<HTMLDivElement>(null);
	const [isDraggedOver, setIsDraggedOver] = useState(false);
	const latest = useRef({ columnStatusId, onColumnDrop });

	useLayoutEffect(() => {
		latest.current = { columnStatusId, onColumnDrop };
	});

	useEffect(() => {
		const element = columnRef.current;
		if (!element) return;

		return dropTargetForElements({
			element,
			getData: () => ({ columnStatusId: latest.current.columnStatusId }),
			onDragEnter: () => setIsDraggedOver(true),
			onDragLeave: () => setIsDraggedOver(false),
			onDrop: ({ source, location }) => {
				setIsDraggedOver(false);
				// A card-level drop target further down the tree already handled
				// this drop; only act when this column itself is the innermost
				// (and only) drop target the pointer landed on.
				if (location.current.dropTargets.length > 1) return;
				const draggedId = (source.data as DragData).nodeId;
				latest.current.onColumnDrop(draggedId, latest.current.columnStatusId);
			},
		});
	}, []);

	return { columnRef, isDraggedOver };
}
