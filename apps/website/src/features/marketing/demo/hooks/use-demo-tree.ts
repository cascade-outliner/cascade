import { formatCalendarDate } from "@cascade/outliner/calendar-date";
import { downloadTextFile } from "@cascade/outliner/download-text-file";
import { formatExport } from "@cascade/outliner/export-format";
import { lexicalToPlainText } from "@cascade/outliner/lexical-content";
import type { AddNodeOptions, VisibleTree } from "@cascade/outliner/tree-types";
import {
	appendRow,
	insertRowAfter,
	moveSubtree,
	patchRow,
	removeSubtree,
	subtreeRange,
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

const EXTENSIONS = { markdown: "md", opml: "opml" } as const;
const MIME_TYPES = { markdown: "text/markdown", opml: "text/x-opml" } as const;

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

	const move: VisibleTree["move"] = (id, target, options = {}) => {
		setAllNodes((current) => {
			const rowsWithExpandedParent = options.expandParentId
				? patchRow(current, options.expandParentId, { expanded: true })
				: current;

			return moveSubtree(rowsWithExpandedParent, id, target);
		});
	};

	const remove: VisibleTree["remove"] = (id) => {
		setAllNodes((current) => removeSubtree(current, id));
		toast.success(m.node_deleted());
	};

	const duplicate: VisibleTree["duplicate"] = (id) => {
		setAllNodes((current) => duplicateDemoSubtree(current, id));
		toast.success(m.node_duplicated());
	};

	const exportSubtree: VisibleTree["exportSubtree"] = (id, format) => {
		const range = subtreeRange(allNodes, id);
		if (!range) return;

		const rootDepth = allNodes[range.start].depth;
		const content = formatExport(
			allNodes.slice(range.start, range.end).map((row) => ({
				depth: row.depth - rootDepth,
				text: lexicalToPlainText(row.content, Number.MAX_SAFE_INTEGER),
			})),
			format,
		);
		downloadTextFile(
			`cascade-export.${EXTENSIONS[format]}`,
			content,
			MIME_TYPES[format],
		);
		toast.success(m.node_exported());
	};

	const updateContent: VisibleTree["updateContent"] = (id, content) => {
		setAllNodes((current) => patchRow(current, id, { content }));
	};

	const setType: VisibleTree["setType"] = (id, typedNode) => {
		setAllNodes((current) =>
			patchRow(current, id, {
				type: typedNode.type,
				metadata: typedNode.metadata,
			}),
		);
	};

	const setDueDate: VisibleTree["setDueDate"] = (id, dueDate) => {
		setAllNodes((current) =>
			patchRow(current, id, {
				dueDate: dueDate ? formatCalendarDate(dueDate) : null,
			}),
		);
	};

	const setTags: VisibleTree["setTags"] = (id, tags) => {
		setAllNodes((current) => patchRow(current, id, { tags }));
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
		hasMore: false,
		toggle,
		move,
		remove,
		duplicate,
		exportSubtree,
		updateContent,
		setType,
		setDueDate,
		setTags,
		add,
		addAfter,
		loadMore: () => {},
		ancestors,
	};
}
