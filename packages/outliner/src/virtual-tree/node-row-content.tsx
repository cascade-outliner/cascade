import { Fragment, type ReactNode } from "react";
import { parseCalendarDate } from "../calendar-date";
import { defaultOutlinerFeatures } from "../features/default-features";
import type { OutlinerFeature } from "../features/types";
import type { BlockType } from "../lexical/lexical-content";
import { getBlockType } from "../lexical/lexical-content";
import type { LexicalElementNode } from "../lexical/read/lexical-read-view";
import { NodeActions } from "../node-actions";
import { type FocusPoint, NodeEditor } from "../node-editor";
import { DefaultNodeLink } from "../node-link-slot";
import type { TagSummary } from "../node-tags";
import { NodeToggle } from "../node-toggle";
import type { NodeTypeName, VisibleNodeRow } from "../node-types";
import { NODE_ROW_ATTRIBUTE } from "./node-rows";
import { RowDragAndDrop } from "./row-drag-drop";
import type { MoveTarget } from "./visible-rows";

export interface NodeRowContentProps {
	row: VisibleNodeRow;
	rows: VisibleNodeRow[];
	indentSize: number;
	renderNodeLink?: (node: Pick<VisibleNodeRow, "id" | "content">) => ReactNode;
	features?: OutlinerFeature[];
	existingTags: TagSummary[];
	onDeleteTag?: (name: string) => void | Promise<void>;
	onTagClick?: (tag: string) => void;
	onDueDateClick?: (date: Date) => void;
	editing: boolean;
	focusPoint: FocusPoint | null;
	onStartEdit: (point?: FocusPoint) => void;
	onExitEdit: () => void;
	onToggle: (expanded: boolean) => void;
	onConvert: (type: NodeTypeName) => void;
	onTurnInto: (blockType: BlockType) => void;
	onToggleTask: (completed: boolean) => void;
	onSetDueDate: (date: Date | null) => void;
	onSetTags: (tags: string[]) => void;
	onDuplicate: () => void;
	onDelete: () => void;
	onSaveContent: (content: { root: LexicalElementNode }) => void;
	onCreateBelow?: () => void;
	onDeleteEmpty?: () => void;
	onIndent?: () => void;
	onOutdent?: () => void;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	onFocusNext?: () => void;
	onFocusPrevious?: () => void;
	/** When false, renders the row without drag-and-drop reordering — e.g.
	 * inside the Calendar entry, where a node isn't part of an orderable
	 * sibling list, just a read/edit projection of it. `onMoveDrop` is
	 * ignored in that case. */
	draggable?: boolean;
	onMoveDrop?: (draggedId: string, target: MoveTarget) => void;
	viewTransitionName?: string;
}

/**
 * The interactive content of one tree row — toggle, link, editor, feature
 * slots, and context menu — shared by `VirtualTreeRow` (the real,
 * virtualized, draggable tree) and the Calendar entry's due-node rows
 * (not virtualized, not draggable, but otherwise the exact same row).
 */
export function NodeRowContent(props: NodeRowContentProps) {
	const { row } = props;
	const features = props.features ?? defaultOutlinerFeatures;
	const completed = row.type === "task" && (row.metadata?.completed ?? false);
	// row.dueDate is a `YYYY-MM-DD` calendar date, not a Date; parse it here
	// (in local time, not UTC) so every consumer below can rely on a real
	// Date | null for display and day math.
	const dueDate = row.dueDate ? parseCalendarDate(row.dueDate) : null;
	const blockType = getBlockType(row.content);

	const featureCtx = {
		row,
		dueDate,
		completed,
		tags: row.tags,
		existingTags: props.existingTags,
		onSetDueDate: props.onSetDueDate,
		onSetTags: props.onSetTags,
		onTagClick: props.onTagClick,
		onDueDateClick: props.onDueDateClick,
		onDeleteTag: props.onDeleteTag,
		onToggleTask: props.onToggleTask,
	};
	const menuItems = features.flatMap((feature) => {
		const node = feature.renderContextMenuItem?.(featureCtx);
		return node ? [{ id: feature.id, node }] : [];
	});

	const content = (
		<NodeActions
			nodeType={row.type}
			blockType={blockType}
			onConvert={props.onConvert}
			onTurnInto={props.onTurnInto}
			onDuplicate={props.onDuplicate}
			onDelete={props.onDelete}
			menuItems={menuItems}
			viewTransitionName={props.viewTransitionName}
		>
			<NodeToggle
				hasChildren={row.hasChildren}
				expanded={row.expanded}
				onToggle={props.onToggle}
			/>
			{props.renderNodeLink ? (
				props.renderNodeLink({ id: row.id, content: row.content })
			) : (
				<DefaultNodeLink />
			)}
			{features.map((feature) => (
				<Fragment key={feature.id}>
					{feature.renderLeading?.(featureCtx)}
				</Fragment>
			))}
			<div className="block w-full">
				<NodeEditor
					id={row.id}
					content={row.content}
					editing={props.editing}
					completed={completed}
					focusPoint={props.focusPoint}
					onStartEdit={props.onStartEdit}
					onExit={props.onExitEdit}
					onSave={props.onSaveContent}
					onCreateBelow={props.onCreateBelow}
					onDeleteEmpty={props.onDeleteEmpty}
					onIndent={props.onIndent}
					onOutdent={props.onOutdent}
					onMoveUp={props.onMoveUp}
					onMoveDown={props.onMoveDown}
					onFocusNext={props.onFocusNext}
					onFocusPrevious={props.onFocusPrevious}
				/>
			</div>
			<div className="flex gap-1 pr-1">
				{features.map((feature) => (
					<Fragment key={feature.id}>
						{feature.renderTrailing?.(featureCtx)}
					</Fragment>
				))}
			</div>
		</NodeActions>
	);

	if (props.draggable === false) {
		return (
			<StaticRowShell
				depth={row.depth}
				indentSize={props.indentSize}
				nodeId={row.id}
			>
				{content}
			</StaticRowShell>
		);
	}

	return (
		<RowDragAndDrop
			row={row}
			rows={props.rows}
			indentSize={props.indentSize}
			onMoveDrop={props.onMoveDrop ?? (() => {})}
		>
			{content}
		</RowDragAndDrop>
	);
}

/**
 * The same visual shell `RowDragAndDrop` renders (indent spacer, drag-handle-
 * width spacer, hover/popup-open treatment) but with no drag-and-drop
 * behavior — for rows that look like tree rows but aren't part of an
 * orderable sibling list, e.g. the Calendar entry's structural and due-node
 * rows. Reserving the handle's width keeps them aligned with real rows even
 * though nothing renders in it.
 */
export function StaticRowShell({
	depth,
	indentSize,
	nodeId,
	children,
}: {
	depth: number;
	indentSize: number;
	nodeId?: string;
	children: ReactNode;
}) {
	return (
		<div
			{...(nodeId ? { [NODE_ROW_ATTRIBUTE]: nodeId } : {})}
			className="group/node py-1 flex items-center gap-2 relative rounded-md has-data-popup-open:bg-accent/25 has-data-popup-open:ring-1 has-data-popup-open:ring-inset has-data-popup-open:ring-accent/60"
		>
			<div style={{ paddingLeft: depth * indentSize }} />
			<span aria-hidden className="shrink-0 size-4" />
			{children}
		</div>
	);
}
