import { parseCalendarDate } from "@cascade/outliner/calendar-date";
import type { NodeMetadataOf } from "@cascade/outliner/node-types";
import { TreeSkeleton } from "@cascade/outliner/tree-skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { useExistingStatuses } from "#/features/nodes/client/statuses/use-existing-statuses";
import {
	useDeleteTag,
	useExistingTags,
} from "#/features/nodes/client/tags/use-existing-tags";
import { useNodeCapabilities } from "#/features/settings/client/settings-context";
import { orpc } from "#/orpc/client";
import { NodeBoard } from "./node-board";
import { useNodeDetailMutations } from "./node-detail.queries";
import { NodeDetailHeader } from "./node-detail-header";
import { NodeTree } from "./node-tree";

export function NodeDetailPage({ nodeId }: { nodeId: string }) {
	const options = orpc.nodes.get.queryOptions({ input: { id: nodeId } });
	const { data: node } = useSuspenseQuery(options);
	const capabilities = useNodeCapabilities();
	const existingTags = useExistingTags();
	const deleteTag = useDeleteTag();
	// Status is per-board (see per-board statuses): this node's own header
	// only offers status assignment when its parent is a board — a plain
	// node's detail page has no board to draw options from.
	const boardId = node.parentIsBoard ? (node.parentId ?? undefined) : undefined;
	const existingStatuses = useExistingStatuses(boardId);
	const mutations = useNodeDetailMutations(nodeId, boardId, options.queryKey);

	// node.dueDate is a `YYYY-MM-DD` calendar date, not a Date; parse it here
	// so NodeDueDatePill always gets a real Date | null (see virtual-tree-row.tsx).
	const dueDate = node.dueDate ? parseCalendarDate(node.dueDate) : null;
	const completed =
		node.type === "task" &&
		((node.metadata as NodeMetadataOf<"task"> | null)?.completed ?? false);

	// Converting this node into a board (or back) lives in the same
	// "Convert into" context menu every tree row already has (see #455
	// follow-up) — right-click it from its parent's tree.
	const header = (
		<NodeDetailHeader
			node={node}
			dueDate={dueDate}
			dueTime={node.dueTime}
			completed={completed}
			existingTags={existingTags}
			existingStatuses={existingStatuses}
			onToggleTask={mutations.toggleTask}
			onDueDateChange={mutations.setDueDate}
			onRecurrenceChange={mutations.setRecurrence}
			onTagsChange={mutations.setTags}
			onDeleteTag={deleteTag}
			onIconChange={mutations.setIcon}
			onPriorityChange={mutations.setPriority}
			onStatusChange={mutations.setStatus}
		/>
	);

	return (
		<Suspense fallback={<TreeSkeleton />}>
			{node.isBoard && capabilities.has("board") ? (
				<NodeBoard nodeId={nodeId} header={header} />
			) : (
				<NodeTree nodeId={nodeId} header={header} />
			)}
		</Suspense>
	);
}
