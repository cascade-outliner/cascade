import { FlagIcon } from "@phosphor-icons/react/ssr";
import { type ReactNode, useState } from "react";
import { NodeEditor } from "../../editor/components/node-editor";
import type { LexicalElementNode } from "../../editor/lexical/model/lexical-node.types";
import type { FocusPoint } from "../../editor/model/focus-point";
import { priorityPill } from "../../features/priority/components/priority-pill.styles";
import { NodeTagPills } from "../../features/tags/components/node-tag-pills";
import { NodeCheckbox } from "../../features/task/components/node-checkbox";
import { useOutlinerLabels } from "../../i18n/outliner-labels-context";
import type { VisibleNodeRow } from "../../nodes/model/node-types";
import type { BoardCardEdge } from "../drag-and-drop/use-board-card-drag-and-drop";
import { useBoardCardDragAndDrop } from "../drag-and-drop/use-board-card-drag-and-drop";

interface BoardCardProps {
	row: VisibleNodeRow;
	columnStatusId: string | null;
	renderNodeLink: (node: Pick<VisibleNodeRow, "id" | "content">) => ReactNode;
	onToggleTask: (id: string, completed: boolean) => void;
	onSaveContent: (id: string, content: { root: LexicalElementNode }) => void;
	onCardDrop: (
		draggedId: string,
		edge: BoardCardEdge,
		overCardId: string,
		columnStatusId: string | null,
	) => void;
}

/** A single card in the board view — a subtree's direct child. The title
 * uses the same `NodeEditor` (click to edit, same Lexical editing surface)
 * the tree row does, rather than a read-only summary, so a node stays fully
 * editable from the board. */
export function BoardCard({
	row,
	columnStatusId,
	renderNodeLink,
	onToggleTask,
	onSaveContent,
	onCardDrop,
}: BoardCardProps) {
	const labels = useOutlinerLabels();
	const [editing, setEditing] = useState(false);
	const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);
	const { cardRef, isDragging, closestEdge } = useBoardCardDragAndDrop({
		cardId: row.id,
		columnStatusId,
		editing,
		onCardDrop,
	});
	const isTask = row.type === "task";
	const completed = isTask && (row.metadata?.completed ?? false);

	return (
		<div
			ref={cardRef}
			data-board-card={row.id}
			className={`group/card relative flex flex-col gap-2 rounded-lg border border-ink/10 bg-surface p-3 shadow-sm ${
				editing ? "" : "cursor-grab"
			} touch-none dark:border-surface/10 dark:bg-ink ${
				isDragging ? "opacity-45" : ""
			}`}
		>
			{closestEdge === "top" && (
				<span className="absolute inset-x-2 -top-1 h-0.5 rounded-full bg-danger" />
			)}
			{closestEdge === "bottom" && (
				<span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-danger" />
			)}
			<div className="flex items-start gap-2">
				{isTask && (
					<NodeCheckbox
						metadata={row.metadata}
						onToggle={(nextCompleted) => onToggleTask(row.id, nextCompleted)}
					/>
				)}
				<div className="min-w-0 flex-1 text-sm">
					<NodeEditor
						id={row.id}
						content={row.content}
						editing={editing}
						completed={completed}
						focusPoint={focusPoint}
						onStartEdit={(point) => {
							setFocusPoint(point ?? null);
							setEditing(true);
						}}
						onExit={() => {
							setEditing(false);
							setFocusPoint(null);
						}}
						onSave={(content) => onSaveContent(row.id, content)}
					/>
				</div>
				{renderNodeLink(row)}
			</div>
			{(row.priority || row.tags.length > 0) && (
				<div className="flex flex-wrap items-center gap-1">
					{row.priority && (
						<span className={priorityPill({ level: row.priority })}>
							<FlagIcon size={11} weight="bold" className="shrink-0" />
							<span className="truncate">
								{labels.priorityLabels[row.priority]}
							</span>
						</span>
					)}
					{row.tags.length > 0 && <NodeTagPills tags={row.tags} />}
				</div>
			)}
		</div>
	);
}
