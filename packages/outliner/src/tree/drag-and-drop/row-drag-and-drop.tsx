import type { ReactNode } from "react";
import type { VisibleNodeRow } from "../../nodes/model/node-types";
import { NODE_ROW_ATTRIBUTE } from "../model/node-row-dom";
import type { MoveTarget } from "../rows/move-targets";
import { NodeDragHandle } from "./node-drag-handle";
import { NodeDropIndicator } from "./node-drop-indicator";
import { useRowDragAndDrop } from "./use-row-drag-and-drop";

interface RowDragAndDropProps {
	row: VisibleNodeRow;
	rows: VisibleNodeRow[];
	indentSize: number;
	onMoveDrop: (draggedId: string, target: MoveTarget) => Promise<boolean>;
	children: ReactNode;
}

export function RowDragAndDrop({
	row,
	rows,
	indentSize,
	onMoveDrop,
	children,
}: RowDragAndDropProps) {
	const { rowRef, handleRef, instruction, isDragging } = useRowDragAndDrop({
		row,
		rows,
		indentSize,
		onMoveDrop,
	});

	return (
		<div
			ref={rowRef}
			{...{ [NODE_ROW_ATTRIBUTE]: row.id }}
			className={`group/node py-1 flex items-center gap-2 relative rounded-md has-data-popup-open:bg-accent/25 has-data-popup-open:ring-1 has-data-popup-open:ring-inset has-data-popup-open:ring-accent/60 ${
				isDragging ? "opacity-45" : ""
			}`}
		>
			<div style={{ paddingLeft: row.depth * indentSize }} />
			<NodeDropIndicator instruction={instruction} />
			<NodeDragHandle ref={handleRef} />
			{children}
		</div>
	);
}
