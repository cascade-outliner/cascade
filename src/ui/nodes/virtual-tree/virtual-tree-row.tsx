"use no memo";

import type { RefObject } from "react";
import type { VisibleNodeRow } from "@/core/nodes/node.types";
import type { LexicalElementNode } from "@/ui/lexical/read/lexical-read-view";
import { NodeActions } from "@/ui/nodes/node-actions";
import { NodeEditor } from "@/ui/nodes/node-editor";
import { NodeLink } from "@/ui/nodes/node-link";
import { NodeToggle } from "@/ui/nodes/node-toggle";
import { RowDragAndDrop } from "@/ui/nodes/virtual-tree/row-drag-drop";
import type { ActiveDragPreview } from "@/ui/nodes/virtual-tree/virtual-tree";
import type { MoveTarget } from "@/ui/nodes/virtual-tree/visible-rows";

export interface VirtualTreeRowProps {
	row: VisibleNodeRow;
	rows: VisibleNodeRow[];
	start: number;
	index: number;
	measureElement: (element: HTMLElement | null) => void;
	editing: boolean;
	onStartEdit: () => void;
	onExitEdit: () => void;
	onToggle: (expanded: boolean) => void;
	onDelete: () => void;
	onSaveContent: (content: { root: LexicalElementNode }) => void;
	onMoveDrop: (draggedId: string, target: MoveTarget) => void;
	previewRef: RefObject<ActiveDragPreview | null>;
}

/**
 * Two-div structure is load-bearing: the outer div owns the virtualizer
 * transform and measurement; the inner div (inside RowDragAndDrop) is the
 * only element GSAP animates, so the two never fight over `transform`.
 */
export function VirtualTreeRow(props: VirtualTreeRowProps) {
	const { row, start, index, measureElement } = props;

	return (
		<div
			ref={measureElement}
			data-index={index}
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: "100%",
				transform: `translateY(${start}px)`,
			}}
		>
			<RowDragAndDrop
				row={row}
				rows={props.rows}
				onMoveDrop={props.onMoveDrop}
				previewRef={props.previewRef}
			>
				<NodeToggle
					hasChildren={row.hasChildren}
					expanded={row.expanded}
					onToggle={props.onToggle}
				/>
				<NodeLink id={row.id} />
				<div
					className="inline-flex items-center gap-2 min-w-0 flex-1"
					style={{ viewTransitionName: `node-${row.id}` }}
				>
					<NodeEditor
						id={row.id}
						content={row.content}
						editing={props.editing}
						onStartEdit={props.onStartEdit}
						onExit={props.onExitEdit}
						onSave={props.onSaveContent}
					/>
					<NodeActions onDelete={props.onDelete} />
				</div>
			</RowDragAndDrop>
		</div>
	);
}
