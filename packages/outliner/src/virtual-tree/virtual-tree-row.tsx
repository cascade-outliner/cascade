import { twMerge } from "tailwind-merge";
import { NodeRowContent } from "./node-row-content";
import type { VirtualTreeRowProps } from "./types";
import { siblingPosition } from "./visible-rows";

export type { VirtualTreeRowProps } from "./types";

export function VirtualTreeRow(props: VirtualTreeRowProps) {
	const { row, start, index, measureElement } = props;
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
			<NodeRowContent
				row={row}
				rows={props.rows}
				indentSize={props.indentSize}
				renderNodeLink={props.renderNodeLink}
				features={props.features}
				existingTags={props.existingTags}
				onDeleteTag={props.onDeleteTag}
				onTagClick={props.onTagClick}
				editing={props.editing}
				focusPoint={props.focusPoint}
				onStartEdit={props.onStartEdit}
				onExitEdit={props.onExitEdit}
				onToggle={props.onToggle}
				onConvert={props.onConvert}
				onTurnInto={props.onTurnInto}
				onToggleTask={props.onToggleTask}
				onSetDueDate={props.onSetDueDate}
				onSetTags={props.onSetTags}
				onDuplicate={props.onDuplicate}
				onDelete={props.onDelete}
				onSaveContent={props.onSaveContent}
				onCreateBelow={props.onCreateBelow}
				onDeleteEmpty={props.onDeleteEmpty}
				onIndent={props.onIndent}
				onOutdent={props.onOutdent}
				onMoveUp={props.onMoveUp}
				onMoveDown={props.onMoveDown}
				onFocusNext={props.onFocusNext}
				onFocusPrevious={props.onFocusPrevious}
				onMoveDrop={props.onMoveDrop}
				viewTransitionName={`node-${row.id}`}
			/>
		</div>
	);
}
