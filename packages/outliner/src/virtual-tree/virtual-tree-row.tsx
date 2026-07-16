"use no memo";

import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import type { LexicalElementNode } from "../lexical/read/lexical-read-view";
import { NodeActions } from "../node-actions";
import { NodeCheckbox } from "../node-checkbox";
import { NodeDueDatePill } from "../node-due-date-pill";
import { type FocusPoint, NodeEditor } from "../node-editor";
import { DefaultNodeLink } from "../node-link-slot";
import { NodeTagPills } from "../node-tags-pills";
import { NodeToggle } from "../node-toggle";
import type { NodeTypeName, VisibleNodeRow } from "../node-types";
import { RowDragAndDrop } from "./row-drag-drop";
import type { MoveTarget } from "./visible-rows";

export interface VirtualTreeRowProps {
	row: VisibleNodeRow;
	rows: VisibleNodeRow[];
	start: number;
	index: number;
	indentSize: number;
	renderNodeLink?: (node: Pick<VisibleNodeRow, "id" | "content">) => ReactNode;
	measureElement: (element: HTMLElement | null) => void;
	/** This user's other tag names, for the tag editor's suggestion list. */
	existingTags: string[];
	/** Excluded by an active filter; rendered collapsed and out of the tab order. */
	isHidden: boolean;
	/** Not itself a filter match, but an ancestor of one; rendered dimmed. */
	isContext: boolean;
	editing: boolean;
	focusPoint: FocusPoint | null;
	onStartEdit: (point?: FocusPoint) => void;
	onExitEdit: () => void;
	onToggle: (expanded: boolean) => void;
	onConvert: (type: NodeTypeName) => void;
	onToggleTask: (completed: boolean) => void;
	onSetDueDate: (date: Date | null) => void;
	onSetTags: (tags: string[]) => void;
	onDeleteTag: (name: string) => void | Promise<void>;
	onDelete: () => void;
	onSaveContent: (content: { root: LexicalElementNode }) => void;
	onCreateBelow: () => void;
	onDeleteEmpty: () => void;
	onIndent: () => void;
	onOutdent: () => void;
	onFocusNext: () => void;
	onFocusPrevious: () => void;
	onMoveDrop: (draggedId: string, target: MoveTarget) => void;
}

export function VirtualTreeRow(props: VirtualTreeRowProps) {
	const { row, start, index, measureElement } = props;
	const completed = row.type === "task" && (row.metadata?.completed ?? false);
	// SSR hydration round-trips the query cache through JSON, which leaves
	// dueDate as an ISO string instead of a Date; normalize it here so every
	// consumer below can rely on a real Date | null.
	const dueDate = row.dueDate ? new Date(row.dueDate) : null;

	return (
		<div
			ref={measureElement}
			data-index={index}
			className={twMerge(
				"top-0 left-0 w-full absolute",
				props.isHidden && "hidden",
				props.isContext && "opacity-45",
			)}
			style={{
				transform: `translateY(${start}px)`,
			}}
		>
			<RowDragAndDrop
				row={row}
				rows={props.rows}
				indentSize={props.indentSize}
				onMoveDrop={props.onMoveDrop}
			>
				<NodeActions
					nodeType={row.type}
					dueDate={dueDate}
					tags={row.tags}
					existingTags={props.existingTags}
					onConvert={props.onConvert}
					onSetDueDate={props.onSetDueDate}
					onSetTags={props.onSetTags}
					onDeleteTag={props.onDeleteTag}
					onDelete={props.onDelete}
					viewTransitionName={`node-${row.id}`}
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
					{row.type === "task" && (
						<NodeCheckbox
							metadata={row.metadata}
							onToggle={props.onToggleTask}
						/>
					)}
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
							onFocusNext={props.onFocusNext}
							onFocusPrevious={props.onFocusPrevious}
						/>
					</div>
					{dueDate && (
						<NodeDueDatePill
							dueDate={dueDate}
							completed={completed}
							onChange={props.onSetDueDate}
						/>
					)}
					<NodeTagPills tags={row.tags} />
				</NodeActions>
			</RowDragAndDrop>
		</div>
	);
}
