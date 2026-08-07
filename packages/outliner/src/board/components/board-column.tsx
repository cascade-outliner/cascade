import { PlusIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import type { BlockType } from "../../editor/lexical/content/lexical-content";
import type { LexicalElementNode } from "../../editor/lexical/model/lexical-node.types";
import { statusDot } from "../../features/status/components/status-pill.styles";
import { useOutlinerLabels } from "../../i18n/outliner-labels-context";
import { toStatusColor } from "../../nodes/model/node-statuses";
import type {
	NodeTypeName,
	VisibleNodeRow,
} from "../../nodes/model/node-types";
import type { BoardCardEdge } from "../drag-and-drop/use-board-card-drag-and-drop";
import { useBoardColumnDropTarget } from "../drag-and-drop/use-board-column-drop-target";
import type { BoardColumn as BoardColumnData } from "../model/board.types";
import { BoardCard } from "./board-card";

interface BoardColumnProps {
	column: BoardColumnData;
	renderNodeLink: (node: Pick<VisibleNodeRow, "id" | "content">) => ReactNode;
	onToggleTask: (id: string, completed: boolean) => void;
	onSaveContent: (id: string, content: { root: LexicalElementNode }) => void;
	onCardDrop: (
		draggedId: string,
		edge: BoardCardEdge,
		overCardId: string,
		columnStatusId: string | null,
	) => void;
	onColumnDrop: (draggedId: string, columnStatusId: string | null) => void;
	onAddCard?: (columnStatusId: string | null) => void;
	onConvert: (id: string, type: NodeTypeName) => undefined | Promise<boolean>;
	onTurnInto: (
		id: string,
		blockType: BlockType,
	) => undefined | Promise<boolean>;
	onSetBoardView: (id: string, isBoard: boolean) => void;
	onDuplicate: (id: string) => void;
	onDelete: (id: string) => void;
}

export function BoardColumn({
	column,
	renderNodeLink,
	onToggleTask,
	onSaveContent,
	onCardDrop,
	onColumnDrop,
	onAddCard,
	onConvert,
	onTurnInto,
	onSetBoardView,
	onDuplicate,
	onDelete,
}: BoardColumnProps) {
	const labels = useOutlinerLabels();
	const { columnRef, isDraggedOver } = useBoardColumnDropTarget({
		columnStatusId: column.status?.id ?? null,
		onColumnDrop,
	});

	return (
		<div className="flex w-72 shrink-0 flex-col">
			<div className="mb-2 flex items-center gap-2 px-1">
				{column.status && (
					<span
						className={statusDot({ hue: toStatusColor(column.status.color) })}
					/>
				)}
				<span className="truncate text-sm font-medium text-ink dark:text-surface">
					{column.status?.name ?? labels.boardUnassignedColumn}
				</span>
				<span className="text-xs text-muted tabular-nums">
					{column.cards.length}
				</span>
			</div>
			<div
				ref={columnRef}
				className={`flex min-h-24 flex-col gap-2 rounded-lg p-1 ${
					isDraggedOver ? "bg-accent/10" : ""
				}`}
			>
				{column.cards.length === 0 ? (
					<div className="rounded-lg border border-dashed border-ink/15 p-3 text-center text-xs text-muted dark:border-surface/15">
						{labels.boardEmptyColumn}
					</div>
				) : (
					column.cards.map((row) => (
						<BoardCard
							key={row.id}
							row={row}
							columnStatusId={column.status?.id ?? null}
							renderNodeLink={renderNodeLink}
							onToggleTask={onToggleTask}
							onSaveContent={onSaveContent}
							onCardDrop={onCardDrop}
							onConvert={onConvert}
							onTurnInto={onTurnInto}
							onSetBoardView={onSetBoardView}
							onDuplicate={onDuplicate}
							onDelete={onDelete}
						/>
					))
				)}
			</div>
			{onAddCard && (
				<button
					type="button"
					onClick={() => onAddCard(column.status?.id ?? null)}
					className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-muted outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50 dark:hover:bg-surface/10 dark:hover:text-surface"
				>
					<PlusIcon size={12} weight="bold" />
					{labels.boardAddCard}
				</button>
			)}
		</div>
	);
}
