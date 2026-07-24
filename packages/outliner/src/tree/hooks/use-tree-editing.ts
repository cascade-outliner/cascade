import { useState } from "react";
import type { FocusPoint } from "../../editor/model/focus-point";
import {
	defaultTypedMetadata,
	type NodeTypeName,
} from "../../nodes/model/node-types";
import { findNodeRow } from "../model/node-row-dom";
import type { VisibleTree } from "../model/tree.types";
import type { VirtualTreeProps } from "../model/virtual-tree.types";
import {
	findIndentTarget,
	findMoveDownTarget,
	findMoveUpTarget,
	findOutdentTarget,
	type MoveTarget,
} from "../rows/visible-rows";
import type { useTreeVirtualizer } from "./use-tree-virtualizer";

type TreeViewport = ReturnType<typeof useTreeVirtualizer>;

export function useTreeEditing(
	tree: VisibleTree,
	newNodeDueDate: VirtualTreeProps["newNodeDueDate"],
	newNodeTags: VirtualTreeProps["newNodeTags"],
	viewport: TreeViewport,
) {
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
	const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);

	const startEditing = (id: string, point?: FocusPoint) => {
		setEditingNodeId(id);
		setFocusPoint(point ?? null);
	};

	const editNewNode = (id: string | null) => {
		if (!id) return;
		setFocusPoint(null);
		setEditingNodeId(id);
	};

	const handleAddRoot = async () => {
		editNewNode(await tree.add({ dueDate: newNodeDueDate, tags: newNodeTags }));
	};

	const handleCreateBelow = async (id: string) => {
		editNewNode(
			await tree.addAfter(id, { dueDate: newNodeDueDate, tags: newNodeTags }),
		);
	};

	const handleDeleteEmpty = (id: string) => {
		const index = tree.rows.findIndex((row) => row.id === id);
		const focusTarget =
			(index > 0 ? tree.rows[index - 1] : null) ?? tree.rows[index + 1] ?? null;

		tree.remove(id);
		setFocusPoint(null);
		setEditingNodeId(focusTarget?.id ?? null);
	};

	const handleMoveDrop = (draggedId: string, target: MoveTarget) => {
		tree.move(draggedId, target);
	};

	const handleIndent = (id: string) => {
		const target = findIndentTarget(tree.rows, id);
		if (!target) return;

		const newParent = tree.rows.find((row) => row.id === target.parentId);
		const expandParentId =
			newParent && !newParent.expanded ? newParent.id : undefined;
		tree.move(id, target, { expandParentId });
	};

	const moveToTarget = (
		id: string,
		findTarget: (
			rows: VisibleTree["rows"],
			nodeId: string,
		) => MoveTarget | null,
	) => {
		const target = findTarget(tree.rows, id);
		if (target) tree.move(id, target);
	};

	const focusRow = (id: string) => {
		const container = viewport.scrollRef.current;
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

		viewport.virtualizer.scrollToIndex(index + direction, { align: "auto" });
		if (editingNodeId === id) {
			setFocusPoint(null);
			setEditingNodeId(target.id);
		} else {
			focusRow(target.id);
		}
	};

	return {
		editingNodeId,
		focusPoint,
		handleAddRoot,
		handleMoveDrop,
		handleCreateBelow,
		handleDeleteEmpty,
		handleIndent,
		handleOutdent: (id: string) => moveToTarget(id, findOutdentTarget),
		handleMoveUp: (id: string) => moveToTarget(id, findMoveUpTarget),
		handleMoveDown: (id: string) => moveToTarget(id, findMoveDownTarget),
		handleFocusNeighbor,
		handleStartEdit: startEditing,
		handleExitEdit: (id: string) =>
			setEditingNodeId((current) => (current === id ? null : current)),
		handleConvert: (id: string, type: NodeTypeName) =>
			tree.setType(id, defaultTypedMetadata(type)),
		handleToggleTask: (id: string, completed: boolean) =>
			tree.setType(id, { type: "task", metadata: { completed } }),
	};
}
