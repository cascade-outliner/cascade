import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import { nextRecurringDueDate } from "@cascade/outliner/recurrence";
import type { AddNodeOptions, VisibleTree } from "@cascade/outliner/tree-types";
import {
	appendRow,
	insertRowAfter,
	moveSubtree,
	patchRow,
	removeSubtree,
} from "@cascade/outliner/visible-rows";
import { toast } from "@cascade/ui/toast";
import { useMemo, useState } from "react";
import { m } from "#/paraglide/messages.js";
import { demoAllNodes } from "../data/demo-tree-seed";
import {
	createDemoRow,
	duplicateDemoSubtree,
} from "../model/demo-tree-operations";
import {
	getDemoTreeAncestors,
	getVisibleDemoRows,
} from "../model/demo-tree-queries";

/**
 * Provides the outliner's VisibleTree contract using local, non-persistent
 * state so the marketing demo can mirror the application without a backend.
 */
export function useDemoTree(rootId: string | null) {
	const [allNodes, setAllNodes] = useState(demoAllNodes);

	const rows = useMemo(
		() => getVisibleDemoRows(allNodes, rootId),
		[allNodes, rootId],
	);
	const ancestors = useMemo(
		() => getDemoTreeAncestors(allNodes, rootId, m.untitled_node()),
		[allNodes, rootId],
	);

	const toggle: VisibleTree["toggle"] = (id, expanded) => {
		setAllNodes((current) => patchRow(current, id, { expanded }));
	};

	const move: VisibleTree["move"] = async (id, target, options = {}) => {
		setAllNodes((current) => {
			const rowsWithExpandedParent = options.expandParentId
				? patchRow(current, options.expandParentId, { expanded: true })
				: current;

			return moveSubtree(rowsWithExpandedParent, id, target);
		});
		return true;
	};

	const remove: VisibleTree["remove"] = (id) => {
		setAllNodes((current) => removeSubtree(current, id));
		toast.success(m.node_deleted());
	};

	const duplicate: VisibleTree["duplicate"] = (id) => {
		setAllNodes((current) => duplicateDemoSubtree(current, id));
		toast.success(m.node_duplicated());
	};

	const updateContent: VisibleTree["updateContent"] = (id, content) => {
		setAllNodes((current) => patchRow(current, id, { content }));
	};

	const setType: VisibleTree["setType"] = (id, typedNode) => {
		setAllNodes((current) =>
			patchRow(current, id, {
				type: typedNode.type,
				metadata: typedNode.metadata,
				...(typedNode.type === "text" ? { recurrence: null } : {}),
			}),
		);
	};

	const setDueDate: VisibleTree["setDueDate"] = (id, dueDate) => {
		setAllNodes((current) =>
			current.map((row) => {
				if (row.id !== id) return row;
				const formattedDueDate = dueDate ? formatCalendarDate(dueDate) : null;
				return {
					...row,
					dueDate: formattedDueDate,
					recurrence:
						formattedDueDate && row.recurrence
							? {
									...row.recurrence,
									anchorDay: Number(formattedDueDate.slice(8, 10)),
								}
							: null,
				};
			}),
		);
	};

	const setRecurrence: VisibleTree["setRecurrence"] = (id, recurrence) => {
		setAllNodes((current) =>
			current.map((row) =>
				row.id === id
					? {
							...row,
							recurrence:
								recurrence && row.dueDate
									? {
											...recurrence,
											anchorDay: Number(row.dueDate.slice(8, 10)),
										}
									: null,
							metadata:
								recurrence && row.type === "task"
									? { completed: false }
									: row.metadata,
						}
					: row,
			),
		);
	};

	const setTaskCompleted: VisibleTree["setTaskCompleted"] = (
		id,
		completed,
		expectedDueDate,
	) => {
		setAllNodes((current) =>
			current.map((row) => {
				if (row.id !== id) return row;
				if (
					completed &&
					row.recurrence &&
					row.dueDate &&
					row.dueDate === expectedDueDate
				) {
					return {
						...row,
						dueDate: nextRecurringDueDate(
							row.dueDate,
							row.recurrence,
							formatCalendarDate(new Date()),
						),
						metadata: { completed: false },
					};
				}
				return { ...row, metadata: { completed } };
			}),
		);
	};

	const setTags: VisibleTree["setTags"] = (id, tags) => {
		setAllNodes((current) => patchRow(current, id, { tags }));
	};

	const setIcon: VisibleTree["setIcon"] = (id, icon) => {
		setAllNodes((current) => patchRow(current, id, { icon }));
	};

	const add: VisibleTree["add"] = async ({
		dueDate = null,
	}: AddNodeOptions = {}) => {
		const parentDepth =
			rootId === null
				? -1
				: (allNodes.find((row) => row.id === rootId)?.depth ?? -1);
		const created = createDemoRow({
			parentId: rootId,
			depth: parentDepth + 1,
			isLastChild: true,
			dueDate: dueDate ? formatCalendarDate(dueDate) : null,
		});

		setAllNodes((current) =>
			rootId === null
				? appendRow(current, created)
				: insertRowAfter(current, rootId, created),
		);

		return created.id;
	};

	const addAfter: VisibleTree["addAfter"] = async (afterId, options = {}) => {
		const sibling = allNodes.find((row) => row.id === afterId);
		if (!sibling) return add(options);

		const created = createDemoRow({
			parentId: sibling.parentId,
			depth: sibling.depth,
			isLastChild: sibling.isLastChild,
			dueDate: options.dueDate ? formatCalendarDate(options.dueDate) : null,
		});

		setAllNodes((current) => insertRowAfter(current, afterId, created));
		return created.id;
	};

	return {
		rows,
		toggle,
		move,
		remove,
		duplicate,
		updateContent,
		setType,
		setDueDate,
		setRecurrence,
		setTaskCompleted,
		setTags,
		setIcon,
		add,
		addAfter,
		ancestors,
	};
}
