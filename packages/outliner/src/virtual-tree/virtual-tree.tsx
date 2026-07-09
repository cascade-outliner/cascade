"use no memo";

import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { Button } from "@cascade/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@cascade/ui/dropdown-menu";
import {
	DotsThreeVerticalIcon,
	EyeIcon,
	EyeSlashIcon,
	PlusIcon,
} from "@phosphor-icons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { dragAnimationConfig } from "../drag-animation/config";
import type { DragPreviewHandle } from "../drag-animation/drag-preview";
import { findNodeRow } from "../drag-animation/node-rows";
import type { FocusPoint } from "../node-editor";
import {
	type NodeMetadataOf,
	nodeTypeDefs,
	type TypedMetadata,
} from "../node-types";
import type { VisibleTree } from "../tree-types";
import { animateNodeRemoval, animateTreeChange } from "./flip-displacement";
import { VirtualTreeRow } from "./virtual-tree-row";
import {
	findIndentTarget,
	findOutdentTarget,
	type MoveTarget,
} from "./visible-rows";

export interface ActiveDragPreview {
	nodeId: string;
	preview: DragPreviewHandle;
}

const LOAD_MORE_THRESHOLD = 50;

export function VirtualTree({
	tree,
	indentSize = 16,
	renderNodeLink,
	header,
	className,
	contentClassName,
	hideCompletedTasks = false,
}: {
	tree: VisibleTree;
	indentSize?: number;
	renderNodeLink?: (id: string) => ReactNode;
	header?: ReactNode;
	/** Overrides the scroll container's default full-viewport-height sizing. */
	className?: string;
	/** Overrides the inner content wrapper's default max-width/padding. */
	contentClassName?: string;
	/** Auto-hide completed task nodes a short while after they're checked off. */
	hideCompletedTasks?: boolean;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const previewRef = useRef<ActiveDragPreview | null>(null);
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
	const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);

	const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
	const [showHidden, setShowHidden] = useState(false);
	const hiddenIdsRef = useRef(hiddenIds);
	const pendingHideTimers = useRef(
		new Map<string, ReturnType<typeof setTimeout>>(),
	);

	useEffect(() => {
		hiddenIdsRef.current = hiddenIds;
	}, [hiddenIds]);

	// Schedule/cancel the delayed auto-hide for completed task rows, and drop
	// hidden/pending state for rows that got unchecked or deleted.
	useEffect(() => {
		const timers = pendingHideTimers.current;
		const rowIds = new Set(tree.rows.map((row) => row.id));
		const toReveal: string[] = [];

		for (const [id, timer] of timers) {
			if (!rowIds.has(id)) {
				clearTimeout(timer);
				timers.delete(id);
			}
		}

		for (const row of tree.rows) {
			const completed =
				row.type === "task" &&
				((row.metadata as NodeMetadataOf<"task"> | null)?.completed ?? false);
			const shouldHide = completed && hideCompletedTasks;

			if (shouldHide) {
				if (!hiddenIdsRef.current.has(row.id) && !timers.has(row.id)) {
					const timer = setTimeout(() => {
						timers.delete(row.id);
						const reveal = () =>
							setHiddenIds((prev) => new Set(prev).add(row.id));
						const container = scrollRef.current;
						if (container) {
							animateNodeRemoval(container, row.id, reveal);
						} else {
							reveal();
						}
					}, dragAnimationConfig.completedHide.delayMs);
					timers.set(row.id, timer);
				}
			} else {
				const timer = timers.get(row.id);
				if (timer) {
					clearTimeout(timer);
					timers.delete(row.id);
				}
				if (hiddenIdsRef.current.has(row.id)) toReveal.push(row.id);
			}
		}

		for (const id of hiddenIdsRef.current) {
			if (!rowIds.has(id)) toReveal.push(id);
		}

		if (toReveal.length > 0) {
			setHiddenIds((prev) => {
				const next = new Set(prev);
				for (const id of toReveal) next.delete(id);
				return next;
			});
		}
	}, [tree.rows, hideCompletedTasks]);

	useEffect(() => {
		const timers = pendingHideTimers.current;
		return () => {
			for (const timer of timers.values()) clearTimeout(timer);
			timers.clear();
		};
	}, []);

	const visibleRows = showHidden
		? tree.rows
		: tree.rows.filter((row) => !hiddenIds.has(row.id));

	const virtualizer = useVirtualizer({
		count: visibleRows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 36,
		overscan: 10,
		getItemKey: (index) => visibleRows[index]?.id ?? index,
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

	return (
		<div ref={scrollRef} className={twMerge("h-dvh overflow-auto", className)}>
			<div
				className={twMerge("max-w-6xl mx-auto px-4 py-16", contentClassName)}
			>
				<div className="mb-4 flex justify-end">
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label="Tree view options"
							className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-dark-grey/60 outline-none hover:bg-ginger/70 hover:text-dark-grey focus-visible:ring-2 focus-visible:ring-redleather/50 dark:text-ginger/60 dark:hover:bg-ginger/20 dark:hover:text-ginger"
						>
							<DotsThreeVerticalIcon size={16} weight="bold" />
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem
								icon={
									showHidden ? (
										<EyeSlashIcon size={14} weight="bold" />
									) : (
										<EyeIcon size={14} weight="bold" />
									)
								}
								disabled={hiddenIds.size === 0 && !showHidden}
								onClick={() => setShowHidden((prev) => !prev)}
							>
								{showHidden ? "Hide completed" : "Show hidden"}
								{hiddenIds.size > 0 ? ` (${hiddenIds.size})` : ""}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				{header}
				{tree.rows.length === 0 ? (
					<p className="text-sm py-4">
						This tree is empty. Add a node to get started.
					</p>
				) : visibleRows.length === 0 ? (
					<p className="text-sm py-4">
						All done! Completed tasks are hidden — click "Show hidden" to view
						them.
					</p>
				) : (
					<div
						style={{
							height: virtualizer.getTotalSize(),
							position: "relative",
						}}
					>
						{virtualItems.map((virtualItem) => {
							const row = visibleRows[virtualItem.index];
							if (!row) return null;
							return (
								<VirtualTreeRow
									key={virtualItem.key}
									row={row}
									rows={tree.rows}
									start={virtualItem.start}
									index={virtualItem.index}
									indentSize={indentSize}
									renderNodeLink={renderNodeLink}
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
