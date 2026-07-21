import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
	draggable,
	dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
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
import { twMerge } from "tailwind-merge";
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
	/** Invoked instead of `onMoveDrop` when the dragged row is part of a
	 * multi-row selection, moving the whole selection together. Falls back to
	 * `onMoveDrop` on just the dragged row if omitted. */
	onBulkMoveDrop?: (draggedIds: string[], target: MoveTarget) => void;
	/** Rows currently multi-selected; dragging a selected row (with more than
	 * one row selected) carries the whole selection instead of just itself. */
	selectedIds: Set<string>;
	selected: boolean;
	onSelect: (id: string, mode: "toggle" | "range") => void;
	onClearSelection: () => void;
	children: ReactNode;
}

type DragData = Record<string, unknown> & {
	/** Every id being dragged, in flat-row order — length 1 for an
	 * unselected row, or the whole selection when dragging a selected one. */
	nodeIds: string[];
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

/** Elements inside a row that should absorb their own click instead of
 * triggering select-on-modifier-click (e.g. the tag/due-date pills' own
 * popovers, or the drag handle itself). */
const ROW_INTERACTIVE_SELECTOR = "button, a, [contenteditable]";

export function RowDragAndDrop({
	row,
	rows,
	indentSize,
	onMoveDrop,
	onBulkMoveDrop,
	selectedIds,
	selected,
	onSelect,
	onClearSelection,
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
	const latest = useRef({
		row,
		rows,
		onMoveDrop,
		onBulkMoveDrop,
		selectedIds,
		indentSize,
	});
	useLayoutEffect(() => {
		latest.current = {
			row,
			rows,
			onMoveDrop,
			onBulkMoveDrop,
			selectedIds,
			indentSize,
		};
	});

	useEffect(() => {
		const rowElement = rowRef.current;
		const handle = handleRef.current;
		if (!rowElement || !handle) return;

		const id = latest.current.row.id;

		return combine(
			draggable({
				element: rowElement,
				dragHandle: handle,
				getInitialData: (): DragData => {
					const { rows: currentRows, selectedIds: currentSelection } =
						latest.current;
					const nodeIds =
						currentSelection.has(id) && currentSelection.size > 1
							? currentRows
									.filter((r) => currentSelection.has(r.id))
									.map((r) => r.id)
							: [id];
					return { nodeIds };
				},
			}),
			dropTargetForElements({
				element: rowElement,
				canDrop: ({ source }) => {
					const dragged = (source.data as DragData).nodeIds;
					return !dragged.some((d) => isInSubtree(latest.current.rows, d, id));
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
					const dragged = (source.data as DragData).nodeIds;
					const inst = extractInstruction(self.data);
					const {
						row: current,
						rows: allRows,
						onMoveDrop: dropOne,
						onBulkMoveDrop: dropMany,
					} = latest.current;
					if (
						!inst ||
						inst.type === "instruction-blocked" ||
						dragged.includes(id)
					) {
						return;
					}
					const drop = (target: MoveTarget) => {
						if (dragged.length > 1 && dropMany) dropMany(dragged, target);
						else dropOne(dragged[0], target);
					};

					if (inst.type === "reorder-above") {
						drop({
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
							drop({
								position: "before",
								targetId: firstChild.id,
								parentId: id,
							});
						} else {
							drop({
								position: "after",
								targetId: id,
								parentId: current.parentId,
							});
						}
					} else if (inst.type === "make-child") {
						drop({ position: "append", parentId: id });
					}
				},
			}),
		);
	}, []);

	return (
		<div
			ref={rowRef}
			{...{ [NODE_ROW_ATTRIBUTE]: row.id }}
			onMouseDownCapture={(e) => {
				// Dragging always starts from the handle: leave it alone so
				// starting a drag on a selected row (with the selection intact)
				// can carry the whole selection, instead of this handler dropping
				// the selection out from under it before dragstart even fires.
				if (handleRef.current?.contains(e.target as Node)) return;

				const modifier = e.ctrlKey || e.metaKey || e.shiftKey;
				if (!modifier) {
					// A plain click while something is selected drops the
					// selection, but this runs in the capture phase — ahead of the
					// row's own default mousedown behavior (Lexical placing the
					// text cursor, the browser starting a native text selection).
					// Deferring the actual state update to a microtask lets that
					// default behavior finish first, so clearing the selection is
					// a trailing side effect instead of a same-tick race that can
					// disrupt it.
					if (selectedIds.size > 0) queueMicrotask(onClearSelection);
					return;
				}
				if ((e.target as HTMLElement).closest(ROW_INTERACTIVE_SELECTOR)) return;
				e.preventDefault();
				e.stopPropagation();
				onSelect(row.id, e.shiftKey ? "range" : "toggle");
			}}
			className={twMerge(
				"group/node py-1 flex items-center gap-2 relative rounded-md has-data-popup-open:bg-accent/25 has-data-popup-open:ring-1 has-data-popup-open:ring-inset has-data-popup-open:ring-accent/60",
				selected && "bg-accent/15 ring-1 ring-inset ring-accent/50",
			)}
		>
			<div style={{ paddingLeft: row.depth * indentSize }} />
			<NodeDropIndicator instruction={instruction} />
			<NodeDragHandle ref={handleRef} />
			{children}
		</div>
	);
}
