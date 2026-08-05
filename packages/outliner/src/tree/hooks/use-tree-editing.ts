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
	findDeleteEmptyFocusTarget,
	findFocusNeighbor,
	navigableRows,
} from "../rows/navigation";
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
	hiddenRowIds: VirtualTreeProps["hiddenRowIds"],
) {
	const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
	const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);

	const visibleForNav = navigableRows(tree.rows, hiddenRowIds);

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
		const source = tree.rows.find((row) => row.id === id);
		editNewNode(
			await tree.addAfter(id, {
				initialType:
					source?.type === "task" ? defaultTypedMetadata("task") : undefined,
				dueDate: newNodeDueDate,
				tags: newNodeTags,
			}),
		);
	};

	const handleDeleteEmpty = (id: string) => {
		const focusTarget = findDeleteEmptyFocusTarget(visibleForNav, id);

		tree.remove(id);
		setFocusPoint(null);
		setEditingNodeId(focusTarget?.id ?? null);
	};

	const handleMoveDrop = async (draggedId: string, target: MoveTarget) => {
		const succeeded = await tree.move(draggedId, target);
		return succeeded !== false;
	};

	const handleIndent = (id: string) => {
		const target = findIndentTarget(visibleForNav, id);
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
		const target = findTarget(visibleForNav, id);
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
		const target = findFocusNeighbor(visibleForNav, id, direction);
		if (!target) return;

		const targetIndex = tree.rows.findIndex((row) => row.id === target.id);
		if (targetIndex !== -1) {
			viewport.virtualizer.scrollToIndex(targetIndex, { align: "auto" });
		}
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
		handleConvert: async (id: string, type: NodeTypeName) =>
			(await tree.setType(id, defaultTypedMetadata(type))) !== false,
		handleToggleTask: (id: string, completed: boolean) =>
			tree.setTaskCompleted(
				id,
				completed,
				tree.rows.find((row) => row.id === id)?.dueDate ?? null,
			),
	};
}
