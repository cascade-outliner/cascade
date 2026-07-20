"use no memo";

import { twMerge } from "tailwind-merge";
import { NodeActions } from "../node-actions";
import { NodeCheckbox } from "../node-checkbox";
import { NodeDueDatePill } from "../node-due-date-pill";
import { NodeEditor } from "../node-editor";
import { DefaultNodeLink } from "../node-link-slot";
import { NodeTagPills } from "../node-tags-pills";
import { NodeToggle } from "../node-toggle";
import { RowDragAndDrop } from "./row-drag-drop";
import type { VirtualTreeRowProps } from "./types";
import { siblingPosition } from "./visible-rows";

export type { VirtualTreeRowProps } from "./types";

export function VirtualTreeRow(props: VirtualTreeRowProps) {
	const { row, start, index, measureElement } = props;
	const completed = row.type === "task" && (row.metadata?.completed ?? false);
	// SSR hydration round-trips the query cache through JSON, which leaves
	// dueDate as an ISO string instead of a Date; normalize it here so every
	// consumer below can rely on a real Date | null.
	const dueDate = row.dueDate ? new Date(row.dueDate) : null;
	const position = siblingPosition(props.rows, index);

	return (
		<div
			ref={measureElement}
			data-index={index}
			role="treeitem"
			// Focus lives on the nested node-text control (roving tabindex);
			// the row itself is reachable via the tree, not the tab order.
			tabIndex={-1}
			aria-level={row.depth + 1}
			aria-expanded={row.hasChildren ? row.expanded : undefined}
			aria-selected={props.editing}
			aria-posinset={position?.posInSet}
			aria-setsize={position?.setSize}
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
							onMoveUp={props.onMoveUp}
							onMoveDown={props.onMoveDown}
							onFocusNext={props.onFocusNext}
							onFocusPrevious={props.onFocusPrevious}
						/>
					</div>
					<div className="flex gap-1 pr-1">
						{dueDate && (
							<NodeDueDatePill
								dueDate={dueDate}
								completed={completed}
								onChange={props.onSetDueDate}
							/>
						)}
						<NodeTagPills tags={row.tags} />
					</div>
				</NodeActions>
			</RowDragAndDrop>
		</div>
	);
}
