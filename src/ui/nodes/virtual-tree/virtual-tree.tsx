"use no memo";

import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { PlusIcon } from "@phosphor-icons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { nodeTypeDefs, type TypedMetadata } from "@/core/nodes/node-types";
import { Button } from "@/ui/button";
import type { DragPreviewHandle } from "@/ui/nodes/drag-animation/drag-preview";
import { findNodeRow } from "@/ui/nodes/drag-animation/node-rows";
import type { FocusPoint } from "@/ui/nodes/node-editor";
import {
	animateNodeRemoval,
	animateTreeChange,
} from "@/ui/nodes/virtual-tree/flip-displacement";
import { useVisibleTree } from "@/ui/nodes/virtual-tree/use-visible-tree";
import { VirtualTreeRow } from "@/ui/nodes/virtual-tree/virtual-tree-row";
import type { MoveTarget } from "@/ui/nodes/virtual-tree/visible-rows";

export interface ActiveDragPreview {
	nodeId: string;
	preview: DragPreviewHandle;
}

const LOAD_MORE_THRESHOLD = 50;

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
	const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);
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

	const handleMoveDrop = (draggedId: string, target: MoveTarget) => {
		const container = scrollRef.current;
		if (!container) return;

		animateTreeChange(container, () => tree.move(draggedId, target), {
			ignoredId: draggedId,
		});

		const active = previewRef.current;
		previewRef.current = null;
		if (!active) return;
		const rowElement =
			findNodeRow(container, draggedId) ??
			(target.position === "append" && target.parentId
				? findNodeRow(container, target.parentId)
				: null);
		if (rowElement) {
			active.preview.settleInto(rowElement.getBoundingClientRect());
		} else {
			// Neither the row nor its parent is in the rendered window.
			active.preview.cancel();
		}
	};

	const handleToggle = (nodeId: string, expanded: boolean) => {
		tree.toggle(nodeId, expanded, (splice) => {
			const container = scrollRef.current;
			if (!container) return splice();
			animateTreeChange(container, splice, { animateEnter: expanded });
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
								focusPoint={editingNodeId === row.id ? focusPoint : null}
								onStartEdit={(point) => {
									setEditingNodeId(row.id);
									setFocusPoint(point ?? null);
								}}
								onExitEdit={() => setEditingNodeId(null)}
								onToggle={(expanded) => handleToggle(row.id, expanded)}
								onConvert={(type) =>
									tree.setType(row.id, {
										type,
										metadata: nodeTypeDefs[type].defaultMetadata,
									} as TypedMetadata)
								}
								onToggleTask={(completed) =>
									tree.setType(row.id, {
										type: "task",
										metadata: { completed },
									})
								}
								onDelete={() => {
									const container = scrollRef.current;
									tree.remove(row.id, (splice) => {
										if (!container) return splice();
										animateNodeRemoval(container, row.id, splice);
									});
								}}
								onSaveContent={(content) => tree.updateContent(row.id, content)}
								onMoveDrop={handleMoveDrop}
								previewRef={previewRef}
							/>
						);
					})}
				</div>
				<Button
					data-flip-id="add-node"
					icon={<PlusIcon className="size-4" />}
					onClick={async () => {
						const container = scrollRef.current;
						const id = await tree.add((splice) => {
							if (!container) return splice();
							animateTreeChange(container, splice, { animateEnter: true });
						});
						setFocusPoint(null);
						setEditingNodeId(id);
					}}
					className="mt-4 mb-4"
				>
					Add node
				</Button>
			</div>
		</div>
	);
}
