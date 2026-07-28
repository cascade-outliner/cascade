import { animateRowReposition } from "@cascade/ui/motion-reposition";
import {
	animateRowEnter,
	flashRowHighlight,
} from "@cascade/ui/motion-row-lifecycle";
import { Fragment, useLayoutEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { parseCalendarDate } from "../../dates/calendar-date";
import { NodeEditor } from "../../editor/components/node-editor";
import { getBlockType } from "../../editor/lexical/content/lexical-content";
import { defaultOutlinerFeatures } from "../../features/registry/default-outliner-features";
import { NodeActions } from "../../nodes/components/node-actions";
import { RowDragAndDrop } from "../drag-and-drop/row-drag-and-drop";
import type { VirtualTreeRowProps } from "../model/virtual-tree.types";
import {
	consumeEntryMotion,
	registerRowElement,
} from "../motion/row-lifecycle";
import { isRowMotionEnabled } from "../motion/row-motion-flag";
import { siblingPosition } from "../rows/visible-rows";
import { DefaultNodeLink } from "./node-link-slot";
import { NodeToggle } from "./node-toggle";

export type { VirtualTreeRowProps } from "../model/virtual-tree.types";

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

	// Candidate motion (issue #509): animate this row's own transform via
	// WAAPI when its virtualized offset changes (drag reorder, indent/
	// outdent, siblings shifting after expand/collapse/create/delete),
	// instead of always snapping. Gated behind isRowMotionEnabled() so
	// production stays snap-only until the perf gate passes.
	const rowElementRef = useRef<HTMLDivElement | null>(null);
	const previousStartRef = useRef(start);
	useLayoutEffect(() => {
		const previousStart = previousStartRef.current;
		previousStartRef.current = start;
		if (rowElementRef.current && isRowMotionEnabled()) {
			animateRowReposition(rowElementRef.current, previousStart, start);
		}
	}, [start]);
	const setRowElement = (element: HTMLDivElement | null) => {
		rowElementRef.current = element;
		registerRowElement(row.id, element);
		measureElement(element);
	};

	// Row lifecycle motion (issue #510): a create/duplicate/restore mutation
	// marks this row's id right before inserting it, and this row's own
	// first mount consumes that marker exactly once — a rise-and-fade
	// entrance for create/duplicate, a one-shot background flash for
	// undo/redo/restore. Deletion's exit animation instead lives in
	// `row-lifecycle.ts`'s `playRowExit`, which the delete mutation awaits
	// *before* removing the row from the tree data, since by the time this
	// row unmounts there's nothing left to animate.
	useLayoutEffect(() => {
		if (!rowElementRef.current) return;
		const motion = consumeEntryMotion(row.id);
		if (motion === "enter") animateRowEnter(rowElementRef.current);
		else if (motion === "flash") flashRowHighlight(rowElementRef.current);
	}, [row.id]);

	// Built once per row and passed to every feature's slot/menu renderer,
	// each of which only reads the handful of fields its own (narrower)
	// context type declares — see features/task, features/due-date,
	// features/tags.
	const featureCtx = {
		row,
		dueDate,
		recurrence: row.recurrence ?? null,
		isTask: row.type === "task",
		completed,
		tags: row.tags,
		existingTags: props.existingTags,
		onSetDueDate: props.onSetDueDate,
		onSetRecurrence: props.onSetRecurrence,
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
			ref={setRowElement}
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
