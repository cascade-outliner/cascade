import { parseCalendarDate } from "@cascade/outliner/calendar-date";
import type { NodeMetadataOf } from "@cascade/outliner/node-types";
import { CascadeLoader } from "@cascade/ui/cascade-loader";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { orpc } from "#/orpc/client";
import { useDeleteTag, useExistingTags } from "#/ui/nodes/use-existing-tags";
import { NodeDetailHeader } from "./NodeDetailView";
import { NodeTree } from "./NodeTree";
import { useNodeDetailMutations } from "./queries";

export function NodeDetailPage({ nodeId }: { nodeId: string }) {
	const options = orpc.nodes.get.queryOptions({ input: { id: nodeId } });
	const { data: node } = useSuspenseQuery(options);
	const existingTags = useExistingTags();
	const deleteTag = useDeleteTag();
	const mutations = useNodeDetailMutations(nodeId, options.queryKey);

	// node.dueDate is a `YYYY-MM-DD` calendar date, not a Date; parse it here
	// so NodeDueDatePill always gets a real Date | null (see virtual-tree-row.tsx).
	const dueDate = node.dueDate ? parseCalendarDate(node.dueDate) : null;
	const completed =
		node.type === "task" &&
		((node.metadata as NodeMetadataOf<"task"> | null)?.completed ?? false);

	return (
		<Suspense fallback={<CascadeLoader />}>
			<NodeTree
				nodeId={nodeId}
				header={
					<NodeDetailHeader
						node={node}
						dueDate={dueDate}
						completed={completed}
						existingTags={existingTags}
						onToggleTask={mutations.toggleTask}
						onDueDateChange={mutations.setDueDate}
						onTagsChange={mutations.setTags}
						onDeleteTag={deleteTag}
					/>
				}
			/>
		</Suspense>
	);
}
