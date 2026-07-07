"use no memo";

import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { Button } from "@cascade/ui/button";
import { PlusIcon } from "@phosphor-icons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { nodeTypeDefs, type TypedMetadata } from "@/core/nodes/node-types";
import type { DragPreviewHandle } from "@/ui/nodes/drag-animation/drag-preview";
import { findNodeRow } from "@/ui/nodes/drag-animation/node-rows";
import type { FocusPoint } from "@/ui/nodes/node-editor";
import {
	animateNodeRemoval,
	animateTreeChange,
} from "@/ui/nodes/virtual-tree/flip-displacement";
import { useVisibleTree } from "@/ui/nodes/virtual-tree/use-visible-tree";
import { VirtualTreeRow } from "@/ui/nodes/virtual-tree/virtual-tree-row";
import {
	findIndentTarget,
	findOutdentTarget,
	type MoveTarget,
} from "@/ui/nodes/virtual-tree/visible-rows";

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

	const handleCreateBelow = async (id: string) => {
		const container = scrollRef.current;
		const newId = await tree.addAfter(id, (splice) => {
			if (!container) return splice();
			animateTreeChange(container, splice, { animateEnter: true });
		});
		setFocusPoint(null);
		setEditingNodeId(newId);
	};

	const handleDeleteEmpty = (id: string) => {
		const index = tree.rows.findIndex((row) => row.id === id);
		const previous = index > 0 ? tree.rows[index - 1] : null;
		const next = tree.rows[index + 1] ?? null;
		const focusTarget = previous ?? next;

		const container = scrollRef.current;
		tree.remove(id, (splice) => {
			if (!container) return splice();
			animateNodeRemoval(container, id, splice);
		});
		setFocusPoint(null);
		setEditingNodeId(focusTarget?.id ?? null);
	};

	const handleIndent = (id: string) => {
		const container = scrollRef.current;
		const target = findIndentTarget(tree.rows, id);
		if (!container || !target) return;
		const newParent = tree.rows.find((row) => row.id === target.parentId);
		const expandParentId =
			newParent && !newParent.expanded ? newParent.id : undefined;
		animateTreeChange(container, () =>
			tree.move(id, target, { expandParentId }),
		);
	};

	const handleOutdent = (id: string) => {
		const container = scrollRef.current;
		const target = findOutdentTarget(tree.rows, id);
		if (!container || !target) return;
		animateTreeChange(container, () => tree.move(id, target));
	};

	const handleToggle = (nodeId: string, expanded: boolean) => {
		tree.toggle(nodeId, expanded, (splice) => {
			const container = scrollRef.current;
			if (!container) return splice();
			animateTreeChange(container, splice, { animateEnter: expanded });
		});
	};

	const focusRow = (id: string) => {
		const container = scrollRef.current;
		if (!container) return;
		const tryFocus = () => {
			const target = findNodeRow(container, id)?.querySelector<HTMLElement>(
				"[data-node-focus-target]",
			);
			target?.focus();
			return !!target;
		};
		if (!tryFocus()) requestAnimationFrame(tryFocus);
	};

	const handleFocusNeighbor = (id: string, direction: 1 | -1) => {
		const index = tree.rows.findIndex((row) => row.id === id);
		if (index === -1) return;
		const target = tree.rows[index + direction];
		if (!target) return;
		virtualizer.scrollToIndex(index + direction, { align: "auto" });
		if (editingNodeId === id) {
			setFocusPoint(null);
			setEditingNodeId(target.id);
		} else {
			focusRow(target.id);
		}
	};

	return (
		<div ref={scrollRef} className="h-dvh overflow-auto">
			<div className="max-w-6xl mx-auto px-4 py-12 sm:py-32">
				{header}
				{tree.rows.length === 0 ? (
					<p className="text-sm py-4">
						This tree is empty. Add a node to get started.
					</p>
				) : (
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
									onExitEdit={() =>
										setEditingNodeId((current) =>
											current === row.id ? null : current,
										)
									}
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
									onSaveContent={(content) =>
										tree.updateContent(row.id, content)
									}
									onCreateBelow={() => handleCreateBelow(row.id)}
									onDeleteEmpty={() => handleDeleteEmpty(row.id)}
									onIndent={() => handleIndent(row.id)}
									onOutdent={() => handleOutdent(row.id)}
									onFocusNext={() => handleFocusNeighbor(row.id, 1)}
									onFocusPrevious={() => handleFocusNeighbor(row.id, -1)}
									onMoveDrop={handleMoveDrop}
									previewRef={previewRef}
								/>
							);
						})}
					</div>
				)}
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
