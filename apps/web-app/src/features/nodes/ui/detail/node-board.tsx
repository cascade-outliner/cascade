import type { BoardDropResult } from "@cascade/outliner/board-types";
import { BoardView } from "@cascade/outliner/board-view";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useExistingStatuses } from "#/features/nodes/client/statuses/use-existing-statuses";
import { useVisibleTree } from "#/features/nodes/client/tree/use-visible-tree";
import { NodeLink } from "#/features/nodes/ui/node-link";

export function NodeBoard({
	nodeId,
	header,
	className = "h-full",
}: {
	nodeId: string;
	header?: ReactNode;
	/** Overrides the full-viewport-height default so this can also render
	 * embedded inline in an outline row (see `renderEmbeddedBoard`), where
	 * `h-dvh` would blow the row out to full screen height. */
	className?: string;
}) {
	const tree = useVisibleTree(nodeId);
	const existingStatuses = useExistingStatuses();
	const directChildren = useMemo(
		() => tree.rows.filter((row) => row.depth === 0),
		[tree.rows],
	);

	function handleDrop(draggedId: string, result: BoardDropResult) {
		const draggedRow = tree.rows.find((row) => row.id === draggedId);
		if (draggedRow && (draggedRow.status?.id ?? null) !== result.statusId) {
			tree.setStatus(draggedId, result.statusId);
		}
		tree.move(draggedId, result.target);
	}

	async function handleAddCard(columnStatusId: string | null) {
		const id = await tree.add();
		if (id && columnStatusId !== null) tree.setStatus(id, columnStatusId);
	}

	return (
		<BoardView
			rows={directChildren}
			rootId={nodeId}
			existingStatuses={existingStatuses}
			renderNodeLink={(node) => (
				<NodeLink id={node.id} content={node.content} />
			)}
			onToggleTask={(id, completed) => {
				const row = tree.rows.find((candidate) => candidate.id === id);
				tree.setTaskCompleted(id, completed, row?.dueDate ?? null);
			}}
			onSaveContent={(id, content) => tree.updateContent(id, content)}
			onDrop={handleDrop}
			onAddCard={handleAddCard}
			header={header}
			className={className}
		/>
	);
}
