import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import type { FocusPoint } from "../node-editor";
import { defaultTypedMetadata, type NodeTypeName } from "../node-types";
import type { VisibleTree } from "../tree-types";
import { findNodeRow } from "./node-rows";
import type { VirtualTreeProps } from "./types";
import {
	findIndentTarget,
	findMoveDownTarget,
	findMoveUpTarget,
	findOutdentTarget,
	type MoveTarget,
} from "./visible-rows";

const LOAD_MORE_THRESHOLD = 50;

/**
 * All stateful wiring behind the tree: virtualization, inline-edit focus
 * tracking, and every row-level command (move, indent, create, delete,
 * focus). Kept separate from rendering so `virtual-tree.tsx` stays a thin
 * "wire hook to view" entry point.
 */
export function useTreeInteractions(
	tree: VisibleTree,
	newNodeDueDate: VirtualTreeProps["newNodeDueDate"],
) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
	const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);

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

	const handleAddRoot = async () => {
		const id = await tree.add({ dueDate: newNodeDueDate });
		setFocusPoint(null);
		setEditingNodeId(id);
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

	/** Keyboard equivalent of dragging a row above/below its sibling. */
	const handleMoveUp = (id: string) => {
		const target = findMoveUpTarget(tree.rows, id);
		if (!target) return;
		tree.move(id, target);
	};

	const handleMoveDown = (id: string) => {
		const target = findMoveDownTarget(tree.rows, id);
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

	const handleStartEdit = (id: string, point?: FocusPoint) => {
		setEditingNodeId(id);
		setFocusPoint(point ?? null);
	};

	const handleExitEdit = (id: string) => {
		setEditingNodeId((current) => (current === id ? null : current));
	};

	const handleConvert = (id: string, type: NodeTypeName) =>
		tree.setType(id, defaultTypedMetadata(type));

	const handleToggleTask = (id: string, completed: boolean) =>
		tree.setType(id, { type: "task", metadata: { completed } });

	return {
		scrollRef,
		virtualizer,
		virtualItems,
		editingNodeId,
		focusPoint,
		handleAddRoot,
		handleMoveDrop,
		handleCreateBelow,
		handleDeleteEmpty,
		handleIndent,
		handleOutdent,
		handleMoveUp,
		handleMoveDown,
		handleFocusNeighbor,
		handleStartEdit,
		handleExitEdit,
		handleConvert,
		handleToggleTask,
	};
}
