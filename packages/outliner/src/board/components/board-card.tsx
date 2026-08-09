import { Fragment, type ReactNode, useState } from "react";
import { parseCalendarDate } from "../../dates/calendar-date";
import type { CalendarTimeString } from "../../dates/calendar-time";
import type { RecurrenceInput } from "../../dates/recurrence";
import { NodeEditor } from "../../editor/components/node-editor";
import type { BlockType } from "../../editor/lexical/content/lexical-content";
import { getBlockType } from "../../editor/lexical/content/lexical-content";
import type { LexicalElementNode } from "../../editor/lexical/model/lexical-node.types";
import type { FocusPoint } from "../../editor/model/focus-point";
import {
	allNodeCapabilities,
	type NodeCapabilityId,
} from "../../features/model/node-capabilities";
import type { OutlinerFeature } from "../../features/model/outliner-feature.types";
import { defaultOutlinerFeatures } from "../../features/registry/default-outliner-features";
import { NodeActions } from "../../nodes/components/node-actions";
import type { PriorityName } from "../../nodes/model/node-priority";
import type { StatusSummary } from "../../nodes/model/node-statuses";
import type { TagSummary } from "../../nodes/model/node-tags";
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
	/** Row/context-menu features to render; see `BoardViewProps.features`. */
	features?: OutlinerFeature[];
	capabilities?: ReadonlySet<NodeCapabilityId>;
	existingTags: TagSummary[];
	existingStatuses: StatusSummary[];
	onToggleTask: (id: string, completed: boolean) => void;
	onSaveContent: (id: string, content: { root: LexicalElementNode }) => void;
	onSetDueDate: (
		id: string,
		date: Date | null,
		time: CalendarTimeString | null,
	) => void;
	onSetRecurrence: (id: string, recurrence: RecurrenceInput | null) => void;
	onSetTags: (id: string, tags: string[]) => void;
	onSetPriority: (id: string, priority: PriorityName | null) => void;
	onSetStatus: (id: string, statusId: string | null) => void;
	onSetIcon: (id: string, icon: string | null) => void;
	onSetColor: (id: string, color: string | null) => void;
	onTagClick?: (tag: string) => void;
	onDeleteTag?: (name: string) => void | Promise<void>;
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
 * editable from the board. A card is otherwise a node like any other: it
 * shares the tree row's own feature set (icon, task checkbox, due date,
 * priority, status, tags — via the same `OutlinerFeature`s, defaulting to
 * `defaultOutlinerFeatures`) and its "Convert into"/duplicate/delete context
 * menu, just reflowed into a card instead of a single row. Only a dedicated
 * drag handle is draggable (not the whole card, see #455 follow-up) so the
 * rest of the card stays tappable on touch devices. */
export function BoardCard({
	row,
	columnStatusId,
	renderNodeLink,
	features = defaultOutlinerFeatures,
	capabilities = allNodeCapabilities,
	existingTags,
	existingStatuses,
	onToggleTask,
	onSaveContent,
	onSetDueDate,
	onSetRecurrence,
	onSetTags,
	onSetPriority,
	onSetStatus,
	onSetIcon,
	onSetColor,
	onTagClick,
	onDeleteTag,
	onCardDrop,
	onConvert,
	onTurnInto,
	onSetBoardView,
	onDuplicate,
	onDelete,
}: BoardCardProps) {
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
	// row.dueDate is a `YYYY-MM-DD` calendar date, not a Date; parse it here
	// (in local time, not UTC), same as the tree row does.
	const dueDate = row.dueDate ? parseCalendarDate(row.dueDate) : null;

	// Same shape as the tree row's own featureCtx (virtual-tree-row.tsx), so
	// a card renders exactly what a tree row would for the same node.
	const featureCtx = {
		row,
		dueDate,
		dueTime: row.dueTime,
		recurrence: row.recurrence ?? null,
		isTask,
		completed,
		tags: row.tags,
		existingTags,
		priority: row.priority ?? null,
		status: row.status ?? null,
		existingStatuses,
		onSetDueDate: (date: Date | null, time: CalendarTimeString | null) =>
			onSetDueDate(row.id, date, time),
		onSetRecurrence: (recurrence: RecurrenceInput | null) =>
			onSetRecurrence(row.id, recurrence),
		onSetTags: (tags: string[]) => onSetTags(row.id, tags),
		onSetPriority: (priority: PriorityName | null) =>
			onSetPriority(row.id, priority),
		onSetStatus: (statusId: string | null) => onSetStatus(row.id, statusId),
		icon: row.icon,
		onSetIcon: (icon: string | null) => onSetIcon(row.id, icon),
		color: row.color,
		onSetColor: (color: string | null) => onSetColor(row.id, color),
		onTagClick,
		onDeleteTag,
		onToggleTask: (nextCompleted: boolean) =>
			onToggleTask(row.id, nextCompleted),
		recurrenceEnabled: capabilities.has("recurrence"),
	};
	const menuItems = features.flatMap((feature) => {
		const node = feature.renderContextMenuItem?.(featureCtx);
		return node ? [{ id: feature.id, node }] : [];
	});
	const trailingItems = features.flatMap((feature) => {
		const node = feature.renderTrailing?.(featureCtx);
		return node ? [{ id: feature.id, node }] : [];
	});

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
					menuItems={menuItems}
					capabilities={capabilities}
					className="flex min-w-0 flex-1 flex-col items-stretch gap-2"
				>
					<div className="flex items-start gap-2">
						{features.map((feature) => (
							<Fragment key={feature.id}>
								{feature.renderLeading?.(featureCtx)}
							</Fragment>
						))}
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
					{trailingItems.length > 0 && (
						<div className="flex flex-wrap items-center gap-1">
							{trailingItems.map(({ id, node }) => (
								<Fragment key={id}>{node}</Fragment>
							))}
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
