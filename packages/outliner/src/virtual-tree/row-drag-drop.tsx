import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
	draggable,
	dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
	attachInstruction,
	extractInstruction,
	type Instruction,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import {
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { NodeDragHandle } from "../node-drag-handle";
import { NodeDropIndicator } from "../node-drop-indicator";
import type { VisibleNodeRow } from "../node-types";
import { NODE_ROW_ATTRIBUTE } from "./node-rows";
import { type MoveTarget, subtreeRange } from "./visible-rows";

interface RowDragAndDropProps {
	row: VisibleNodeRow;
	rows: VisibleNodeRow[];
	indentSize: number;
	onMoveDrop: (draggedId: string, target: MoveTarget) => void;
	children: ReactNode;
}

type DragData = Record<string, unknown> & {
	nodeId: string;
};

/** True when `id` is `sourceId` itself or a visible descendant of it. */
function isInSubtree(rows: VisibleNodeRow[], sourceId: string, id: string) {
	if (sourceId === id) return true;
	const range = subtreeRange(rows, sourceId);
	if (!range) return false;
	for (let i = range.start + 1; i < range.end; i++) {
		if (rows[i].id === id) return true;
	}
	return false;
}

export function RowDragAndDrop({
	row,
	rows,
	indentSize,
	onMoveDrop,
	children,
}: RowDragAndDropProps) {
	const rowRef = useRef<HTMLDivElement>(null);
	const handleRef = useRef<HTMLButtonElement>(null);
	const [instruction, setInstruction] = useState<Instruction | null>(null);

	// The drag-and-drop handlers below are wired up once (empty deps) and close
	// over `latest` instead of `row`/`rows`/etc. directly, so this ref has to
	// stay current across every render. Assigning it in a layout effect (not
	// inline during render) keeps this component compatible with React
	// Compiler, which forbids ref writes during render.
	const latest = useRef({ row, rows, onMoveDrop, indentSize });
	useLayoutEffect(() => {
		latest.current = { row, rows, onMoveDrop, indentSize };
	});

	useEffect(() => {
		const rowElement = rowRef.current;
		const handle = handleRef.current;
		if (!rowElement || !handle) return;

		const id = latest.current.row.id;

		return combine(
			draggable({
				// Only the handle carries the native `draggable` attribute (rather
				// than the whole row via `dragHandle`) so the row's text stays
				// selectable — Firefox refuses to let users select text inside any
				// `draggable="true"` ancestor, handle-restricted or not.
				element: handle,
				getInitialData: (): DragData => ({ nodeId: id }),
				onGenerateDragPreview: ({ nativeSetDragImage }) => {
					setCustomNativeDragPreview({
						nativeSetDragImage,
						render: ({ container }) => {
							const preview = rowElement.cloneNode(true) as HTMLElement;
							preview.style.width = `${rowElement.offsetWidth}px`;
							container.append(preview);
							return () => preview.remove();
						},
					});
				},
			}),
			dropTargetForElements({
				element: rowElement,
				canDrop: ({ source }) => {
					const dragged = (source.data as DragData).nodeId;
					return !isInSubtree(latest.current.rows, dragged, id);
				},
				getData: ({ input, element }) => {
					const { row: current, indentSize } = latest.current;
					return attachInstruction(
						{ nodeId: id },
						{
							input,
							element,
							currentLevel: current.depth,
							indentPerLevel: indentSize,
							mode:
								current.expanded && current.hasChildren
									? "expanded"
									: current.isLastChild
										? "last-in-group"
										: "standard",
							block: ["reparent"],
						},
					);
				},
				onDrag: ({ self }) => setInstruction(extractInstruction(self.data)),
				onDragLeave: () => setInstruction(null),
				onDrop: ({ self, source }) => {
					setInstruction(null);
					const dragged = (source.data as DragData).nodeId;
					const inst = extractInstruction(self.data);
					const {
						row: current,
						rows: allRows,
						onMoveDrop: drop,
					} = latest.current;
					if (!inst || inst.type === "instruction-blocked" || dragged === id) {
						return;
					}

					if (inst.type === "reorder-above") {
						drop(dragged, {
							position: "before",
							targetId: id,
							parentId: current.parentId,
						});
					} else if (inst.type === "reorder-below") {
						const index = allRows.findIndex((r) => r.id === id);
						const firstChild = allRows[index + 1];
						if (
							current.expanded &&
							current.hasChildren &&
							firstChild?.parentId === id
						) {
							// Dropping below an expanded parent means "first child".
							drop(dragged, {
								position: "before",
								targetId: firstChild.id,
								parentId: id,
							});
						} else {
							drop(dragged, {
								position: "after",
								targetId: id,
								parentId: current.parentId,
							});
						}
					} else if (inst.type === "make-child") {
						drop(dragged, { position: "append", parentId: id });
					}
				},
			}),
		);
	}, []);

	return (
		<div
			ref={rowRef}
			{...{ [NODE_ROW_ATTRIBUTE]: row.id }}
			className="group/node py-1 flex items-center gap-2 relative rounded-md has-data-popup-open:bg-accent/25 has-data-popup-open:ring-1 has-data-popup-open:ring-inset has-data-popup-open:ring-accent/60"
		>
			<div style={{ paddingLeft: row.depth * indentSize }} />
			<NodeDropIndicator instruction={instruction} />
			<NodeDragHandle ref={handleRef} />
			{children}
		</div>
	);
}
