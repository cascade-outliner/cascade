"use no memo";

import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import type { DragPreviewHandle } from "@/ui/nodes/drag-animation/drag-preview";
import { findNodeRow } from "@/ui/nodes/drag-animation/node-rows";
import {
	captureRowPositions,
	playDisplacement,
} from "@/ui/nodes/virtual-tree/flip-displacement";
import { useVisibleTree } from "@/ui/nodes/virtual-tree/use-visible-tree";
import { VirtualTreeRow } from "@/ui/nodes/virtual-tree/virtual-tree-row";
import type { MoveTarget } from "@/ui/nodes/virtual-tree/visible-rows";

export interface ActiveDragPreview {
	nodeId: string;
	preview: DragPreviewHandle;
}

const LOAD_MORE_THRESHOLD = 50;

/**
 * Flattened, virtualized node tree. "use no memo" is required: React Compiler
 * memoization breaks useVirtualizer's scroll-driven re-renders.
 */
export function VirtualTree({
	rootId,
	header,
}: {
	rootId: string | null;
	header?: React.ReactNode;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const previewRef = useRef<ActiveDragPreview | null>(null);
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
	const tree = useVisibleTree(rootId);

	const virtualizer = useVirtualizer({
		count: tree.rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 36,
		overscan: 10,
		getItemKey: (index) => tree.rows[index]?.id ?? index,
	});

	useEffect(() => {
		const scrollElement = scrollRef.current;
		if (!scrollElement) return;
		return autoScrollForElements({ element: scrollElement });
	}, []);

	const virtualItems = virtualizer.getVirtualItems();
	const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? 0;
	useEffect(() => {
		if (tree.hasMore && lastIndex >= tree.rows.length - LOAD_MORE_THRESHOLD) {
			tree.loadMore();
		}
	}, [lastIndex, tree.hasMore, tree.rows.length, tree.loadMore]);

	/**
	 * Drop orchestration: capture rendered row positions, splice the cache
	 * optimistically, then after the React commit FLIP the displaced rows and
	 * fly the drag preview into the moved row's new position.
	 */
	const handleMoveDrop = (draggedId: string, target: MoveTarget) => {
		const container = scrollRef.current;
		if (!container) return;

		const parentRow =
			target.position === "append" && target.parentId
				? tree.rows.find((r) => r.id === target.parentId)
				: undefined;

		const before = captureRowPositions(container);
		tree.move(draggedId, target, {
			expandParent: parentRow ? !parentRow.expanded : false,
		});

		// Double rAF: the cache splice schedules a React render; wait for commit.
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				playDisplacement(container, before, draggedId);
				const active = previewRef.current;
				previewRef.current = null;
				if (!active) return;
				const rowElement = findNodeRow(container, draggedId);
				if (rowElement) {
					active.preview.settleInto(rowElement.getBoundingClientRect());
				} else {
					// Row landed outside the rendered window.
					active.preview.cancel();
				}
			});
		});
	};

	return (
		<div ref={scrollRef} className="h-dvh overflow-auto">
			<div className="max-w-6xl mx-auto px-4 py-12 sm:py-32">
				{header}
				<div
					style={{
						height: virtualizer.getTotalSize(),
						position: "relative",
					}}
				>
					{virtualItems.map((virtualItem) => {
						const row = tree.rows[virtualItem.index];
						if (!row) return null;
						return (
							<VirtualTreeRow
								key={virtualItem.key}
								row={row}
								rows={tree.rows}
								start={virtualItem.start}
								index={virtualItem.index}
								measureElement={virtualizer.measureElement}
								editing={editingNodeId === row.id}
								onStartEdit={() => setEditingNodeId(row.id)}
								onExitEdit={() => setEditingNodeId(null)}
								onToggle={(expanded) => tree.toggle(row.id, expanded)}
								onDelete={() => tree.remove(row.id)}
								onSaveContent={(content) => tree.updateContent(row.id, content)}
								onMoveDrop={handleMoveDrop}
								previewRef={previewRef}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}
