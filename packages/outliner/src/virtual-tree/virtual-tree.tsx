"use no memo";

import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { Button } from "@cascade/ui/button";
import { PlusIcon } from "@phosphor-icons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useOutlinerLabels } from "../labels-context";
import type { FocusPoint } from "../node-editor";
import { defaultTypedMetadata } from "../node-types";
import type { VisibleTree } from "../tree-types";
import { findNodeRow } from "./node-rows";
import { VirtualTreeRow } from "./virtual-tree-row";
import {
	findIndentTarget,
	findOutdentTarget,
	type MoveTarget,
} from "./visible-rows";

const LOAD_MORE_THRESHOLD = 50;

export function VirtualTree({
	tree,
	indentSize = 16,
	renderNodeLink,
	header,
	className,
	contentClassName,
	hiddenRowIds,
	contextRowIds,
	newNodeDueDate,
}: {
	tree: VisibleTree;
	indentSize?: number;
	renderNodeLink?: (
		node: Pick<VisibleTree["rows"][number], "id" | "content">,
	) => ReactNode;
	header?: ReactNode;
	/** Overrides the scroll container's default full-viewport-height sizing. */
	className?: string;
	/** Overrides the inner content wrapper's default max-width/padding. */
	contentClassName?: string;
	/** Row ids to hide from view, e.g. rows excluded by an active filter. */
	hiddenRowIds?: Set<string>;
	/** Row ids to render dimmed but still visible, e.g. ancestors kept for context. */
	contextRowIds?: Set<string>;
	/** Stamped onto nodes created here, e.g. so a node added under an active
	 * "Due today" filter matches it instead of immediately being hidden. */
	newNodeDueDate?: Date | null;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
	const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);
	const labels = useOutlinerLabels();

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
		tree.move(draggedId, target);
	};

	const handleCreateBelow = async (id: string) => {
		const newId = await tree.addAfter(id, { dueDate: newNodeDueDate });
		setFocusPoint(null);
		setEditingNodeId(newId);
	};

	const handleDeleteEmpty = (id: string) => {
		const index = tree.rows.findIndex((row) => row.id === id);
		const previous = index > 0 ? tree.rows[index - 1] : null;
		const next = tree.rows[index + 1] ?? null;
		const focusTarget = previous ?? next;

		tree.remove(id);
		setFocusPoint(null);
		setEditingNodeId(focusTarget?.id ?? null);
	};

	const handleIndent = (id: string) => {
		const target = findIndentTarget(tree.rows, id);
		if (!target) return;
		const newParent = tree.rows.find((row) => row.id === target.parentId);
		const expandParentId =
			newParent && !newParent.expanded ? newParent.id : undefined;
		tree.move(id, target, { expandParentId });
	};

	const handleOutdent = (id: string) => {
		const target = findOutdentTarget(tree.rows, id);
		if (!target) return;
		tree.move(id, target);
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
		<div ref={scrollRef} className={twMerge("h-dvh overflow-auto", className)}>
			<div
				className={twMerge("max-w-6xl mx-auto px-4 py-16", contentClassName)}
			>
				{header}
				{tree.rows.length === 0 ? (
					<p className="text-sm py-4">{labels.emptyTree}</p>
				) : hiddenRowIds?.size === tree.rows.length ? (
					<p className="text-sm py-4">{labels.emptyFilterResults}</p>
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
									indentSize={indentSize}
									renderNodeLink={renderNodeLink}
									measureElement={virtualizer.measureElement}
									isHidden={hiddenRowIds?.has(row.id) ?? false}
									isContext={contextRowIds?.has(row.id) ?? false}
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
									onToggle={(expanded) => tree.toggle(row.id, expanded)}
									onConvert={(type) =>
										tree.setType(row.id, defaultTypedMetadata(type))
									}
									onToggleTask={(completed) =>
										tree.setType(row.id, {
											type: "task",
											metadata: { completed },
										})
									}
									onSetDueDate={(date) => tree.setDueDate(row.id, date)}
									onDelete={() => tree.remove(row.id)}
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
								/>
							);
						})}
					</div>
				)}
				<Button
					icon={<PlusIcon className="size-4" />}
					onClick={async () => {
						const id = await tree.add({ dueDate: newNodeDueDate });
						setFocusPoint(null);
						setEditingNodeId(id);
					}}
					className="mt-4 mb-4"
				>
					{labels.addNode}
				</Button>
			</div>
		</div>
	);
}
