import { FlagIcon } from "@phosphor-icons/react/ssr";
import { type ReactNode, useState } from "react";
import { NodeEditor } from "../../editor/components/node-editor";
import type { BlockType } from "../../editor/lexical/content/lexical-content";
import { getBlockType } from "../../editor/lexical/content/lexical-content";
import type { LexicalElementNode } from "../../editor/lexical/model/lexical-node.types";
import type { FocusPoint } from "../../editor/model/focus-point";
import { priorityPill } from "../../features/priority/components/priority-pill.styles";
import { NodeTagPills } from "../../features/tags/components/node-tag-pills";
import { NodeCheckbox } from "../../features/task/components/node-checkbox";
import { useOutlinerLabels } from "../../i18n/outliner-labels-context";
import { NodeActions } from "../../nodes/components/node-actions";
import type {
	NodeTypeName,
	VisibleNodeRow,
} from "../../nodes/model/node-types";
import { NodeDragHandle } from "../../tree/drag-and-drop/node-drag-handle";
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
	onConvert: (id: string, type: NodeTypeName) => undefined | Promise<boolean>;
	onTurnInto: (
		id: string,
		blockType: BlockType,
	) => undefined | Promise<boolean>;
	onSetBoardView: (id: string, isBoard: boolean) => void;
	onDuplicate: (id: string) => void;
	onDelete: (id: string) => void;
}

/** A single card in the board view — a subtree's direct child. The title
 * uses the same `NodeEditor` (click to edit, same Lexical editing surface)
 * the tree row does, rather than a read-only summary, so a node stays fully
 * editable from the board. Only a dedicated drag handle is draggable (not
 * the whole card, see #455 follow-up) so the rest of the card stays tappable
 * on touch devices — including for the row's own "Convert into"/duplicate/
 * delete context menu, the same one a tree row has. */
export function BoardCard({
	row,
	columnStatusId,
	renderNodeLink,
	onToggleTask,
	onSaveContent,
	onCardDrop,
	onConvert,
	onTurnInto,
	onSetBoardView,
	onDuplicate,
	onDelete,
}: BoardCardProps) {
	const labels = useOutlinerLabels();
	const [editing, setEditing] = useState(false);
	const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);
	const { cardRef, handleRef, isDragging, closestEdge } =
		useBoardCardDragAndDrop({
			cardId: row.id,
			columnStatusId,
			editing,
			onCardDrop,
		});
	const isTask = row.type === "task";
	const completed = isTask && (row.metadata?.completed ?? false);
	const blockType = getBlockType(row.content);

	return (
		<div
			ref={cardRef}
			data-board-card={row.id}
			className={`group/card group/node relative flex flex-col gap-2 rounded-lg border border-ink/10 bg-surface p-3 shadow-sm dark:border-surface/10 dark:bg-ink ${
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
				<NodeActions
					nodeType={row.type}
					blockType={blockType}
					isBoard={row.isBoard ?? false}
					onConvert={(type) => onConvert(row.id, type)}
					onTurnInto={(nextBlockType) => onTurnInto(row.id, nextBlockType)}
					onSetBoardView={(isBoard) => onSetBoardView(row.id, isBoard)}
					onConversionSuccess={() => {}}
					onDuplicate={() => onDuplicate(row.id)}
					onDelete={() => onDelete(row.id)}
					menuItems={[]}
					className="flex min-w-0 flex-1 flex-col items-stretch gap-2"
				>
					<div className="flex items-start gap-2">
						{isTask && (
							<NodeCheckbox
								metadata={row.metadata}
								onToggle={(nextCompleted) =>
									onToggleTask(row.id, nextCompleted)
								}
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
				</NodeActions>
				{/* Outside NodeActions (see #455 follow-up): the handle is the
				only draggable part of the card, and — unlike the rest of the
				card — a long-press/right-click on it must not also open the
				context menu that wraps everything else. */}
				<NodeDragHandle ref={handleRef} />
			</div>
		</div>
	);
}
