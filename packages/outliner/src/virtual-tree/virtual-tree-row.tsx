import { Fragment } from "react";
import { twMerge } from "tailwind-merge";
import { parseCalendarDate } from "../calendar-date";
import { defaultOutlinerFeatures } from "../features/default-features";
import { getBlockType } from "../lexical/lexical-content";
import { NodeActions } from "../node-actions";
import { NodeEditor } from "../node-editor";
import { DefaultNodeLink } from "../node-link-slot";
import { NodeToggle } from "../node-toggle";
import { RowDragAndDrop } from "./row-drag-drop";
import type { VirtualTreeRowProps } from "./types";
import { siblingPosition } from "./visible-rows";

export type { VirtualTreeRowProps } from "./types";

export function VirtualTreeRow(props: VirtualTreeRowProps) {
	const { row, start, index, measureElement } = props;
	const features = props.features ?? defaultOutlinerFeatures;
	const completed = row.type === "task" && (row.metadata?.completed ?? false);
	// row.dueDate is a `YYYY-MM-DD` calendar date, not a Date; parse it here
	// (in local time, not UTC) so every consumer below can rely on a real
	// Date | null for display and day math.
	const dueDate = row.dueDate ? parseCalendarDate(row.dueDate) : null;
	const position = siblingPosition(props.rows, index);
	const blockType = getBlockType(row.content);

	// Built once per row and passed to every feature's slot/menu renderer,
	// each of which only reads the handful of fields its own (narrower)
	// context type declares — see features/task, features/due-date,
	// features/tags.
	const featureCtx = {
		row,
		dueDate,
		completed,
		tags: row.tags,
		existingTags: props.existingTags,
		onSetDueDate: props.onSetDueDate,
		onSetTags: props.onSetTags,
		onTagClick: props.onTagClick,
		onDeleteTag: props.onDeleteTag,
		onToggleTask: props.onToggleTask,
	};
	const menuItems = features.flatMap((feature) => {
		const node = feature.renderContextMenuItem?.(featureCtx);
		return node ? [{ id: feature.id, node }] : [];
	});

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
					blockType={blockType}
					onConvert={props.onConvert}
					onTurnInto={props.onTurnInto}
					onDuplicate={props.onDuplicate}
					onDelete={props.onDelete}
					menuItems={menuItems}
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
			</RowDragAndDrop>
		</div>
	);
}
