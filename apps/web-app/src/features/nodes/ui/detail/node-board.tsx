import { BoardView } from "@cascade/outliner/board-view";
import {
	defaultTypedMetadata,
	type NodeTypeName,
} from "@cascade/outliner/node-types";
import type { ReactNode } from "react";
import { NodeLink } from "#/features/nodes/ui/node-link";
import { BoardColumnsControl } from "./board-columns-control";
import { useNodeBoard } from "./node-board.queries";

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
	const {
		tree,
		capabilities,
		features,
		filters,
		setFilters,
		directChildren,
		existingStatuses,
		existingTags,
		deleteTag,
		updateStatus,
		handleDrop,
		handleAddCard,
		handleTurnInto,
	} = useNodeBoard(nodeId);

	return (
		<BoardView
			rows={directChildren}
			rootId={nodeId}
			existingStatuses={capabilities.has("status") ? existingStatuses : []}
			existingTags={existingTags}
			features={features}
			capabilities={capabilities}
			header={
				<>
					{header}
					{capabilities.has("status") && (
						<BoardColumnsControl boardId={nodeId} />
					)}
				</>
			}
			renderNodeLink={(node) => (
				<NodeLink id={node.id} content={node.content} />
			)}
			onToggleTask={(id, completed) => {
				const row = tree.rows.find((candidate) => candidate.id === id);
				tree.setTaskCompleted(id, completed, row?.dueDate ?? null);
			}}
			onSaveContent={(id, content) => tree.updateContent(id, content)}
			onSetDueDate={(id, date, time) => tree.setDueDate(id, date, time)}
			onSetRecurrence={(id, recurrence) => tree.setRecurrence(id, recurrence)}
			onSetTags={(id, tags) => tree.setTags(id, tags)}
			onSetPriority={(id, priority) => tree.setPriority(id, priority)}
			onSetStatus={(id, statusId) => tree.setStatus(id, statusId)}
			onSetIcon={(id, icon) => tree.setIcon(id, icon)}
			onSetColor={(id, color) => tree.setColor(id, color)}
			onDeleteTag={deleteTag}
			onTagClick={(tag) =>
				setFilters({
					...filters,
					tags: filters.tags.some(
						(name) => name.toLowerCase() === tag.toLowerCase(),
					)
						? filters.tags
						: [...filters.tags, tag],
				})
			}
			onDrop={handleDrop}
			onAddCard={handleAddCard}
			onConvert={(id, type: NodeTypeName) =>
				tree.setType(id, defaultTypedMetadata(type))
			}
			onTurnInto={handleTurnInto}
			onSetBoardView={(id, isBoard) => tree.setBoardView(id, isBoard)}
			onDuplicate={(id) => tree.duplicate(id)}
			onDelete={(id) => tree.remove(id)}
			onToggleColumnHidden={(statusId, hidden) =>
				updateStatus(statusId, { hidden }, () => {})
			}
			className={className}
		/>
	);
}
