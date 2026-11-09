import type { Row } from "@cascade/data";
import { colors, duration, easing, space } from "@cascade/theme/tokens.stylex";
import { DndContext } from "@dnd-kit/core";
import * as stylex from "@stylexjs/stylex";
import {
	useWindowVirtualizer,
	type VirtualItem,
	type Virtualizer,
} from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, useState } from "react";
import { DragHandleContext, ItemContext } from "../context";
import { DragGhost } from "../dnd/drag-ghost";
import { DropIndicator } from "../dnd/drop-indicator";
import { type MoveHandler, useOutlineDnd } from "../dnd/use-outline-dnd";
import { useRowDnd } from "../dnd/use-row-dnd";
import { CHEVRON_CENTER, INDENT } from "../layout";

const REFLOW_MS = 320;
const NONE: ReadonlySet<string> = new Set();

const enter = stylex.keyframes({
	from: { opacity: 0, transform: "translateY(-6px)" },
});

const styles = stylex.create({
	viewport: {
		position: "relative",
		width: "100%",
	},
	list: {
		listStyle: "none",
	},
	row: {
		position: "absolute",
		top: 0,
		left: 0,
		width: "100%",
		paddingBottom: space["1"],
		transition: `opacity ${duration["100"]} ease-in-out`,
	},
	rowMoving: {
		transition: `opacity ${duration["100"]} ease-in-out, transform ${duration["200"]} ${easing.soft}`,
	},
	dragging: {
		opacity: 0.3,
	},
	indentMoving: {
		transition: `padding-left ${duration["200"]} ${easing.soft}`,
	},
	entered: {
		animationName: enter,
		animationDuration: duration["200"],
		animationTimingFunction: easing.soft,
		animationFillMode: "backwards",
	},
	guide: {
		position: "absolute",
		top: 0,
		bottom: 0,
		width: 1,
		backgroundColor: colors.border,
	},
});

type RowRenderer = (row: Row) => React.ReactNode;

interface VirtualRowProps {
	item: VirtualItem;
	row: Row;
	virtualizer: Virtualizer<Window, Element>;
	/** The outline just changed shape: glide to the new slot instead of jumping. */
	moving: boolean;
	/** New since the last shape, so it fades in. */
	entered: boolean;
	children: RowRenderer;
}

interface Shape {
	rootId: string | null;
	signature: string;
	ids: ReadonlySet<string>;
	entered: ReadonlySet<string>;
	moving: boolean;
	version: number;
}

/**
 * Which rows moved or appeared since the last render with a different outline.
 * Only structural edits count: scrolling, measuring and zooming stay instant.
 */
function useReflow(rows: Row[], rootId: string | null): Shape {
	const signature = rows.map((row) => `${row.node.id}:${row.depth}`).join(" ");
	const [shape, setShape] = useState<Shape>(() => ({
		rootId,
		signature,
		ids: new Set(rows.map((row) => row.node.id)),
		entered: NONE,
		moving: false,
		version: 0,
	}));

	let current = shape;
	if (shape.signature !== signature || shape.rootId !== rootId) {
		const sameRoot = shape.rootId === rootId;
		const ids = new Set(rows.map((row) => row.node.id));
		current = {
			rootId,
			signature,
			ids,
			entered: sameRoot
				? new Set([...ids].filter((id) => !shape.ids.has(id)))
				: NONE,
			moving: sameRoot,
			version: shape.version + 1,
		};
		setShape(current);
	}

	const { moving, version } = current;
	useEffect(() => {
		if (!moving) return;
		const timer = setTimeout(() => {
			setShape((latest) =>
				latest.version === version
					? { ...latest, moving: false, entered: NONE }
					: latest,
			);
		}, REFLOW_MS);
		return () => clearTimeout(timer);
	}, [moving, version]);

	return current;
}

function VirtualRow({
	item,
	row,
	virtualizer,
	moving,
	entered,
	children,
}: VirtualRowProps) {
	const { node, depth } = row;
	const dnd = useRowDnd(node.id, depth);
	const setDndRef = dnd.setNodeRef;
	const setRef = useCallback(
		(element: HTMLLIElement | null) => {
			virtualizer.measureElement(element);
			setDndRef(element);
		},
		[virtualizer, setDndRef],
	);

	return (
		<li
			ref={setRef}
			data-testid="outliner-row"
			data-index={item.index}
			{...stylex.props(
				styles.row,
				moving && styles.rowMoving,
				dnd.isDragging && styles.dragging,
			)}
			style={{
				transform: `translateY(${
					item.start - virtualizer.options.scrollMargin
				}px)`,
			}}
		>
			{Array.from({ length: depth }, (_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: guides are a fixed-length, non-reorderable sequence
					key={i}
					{...stylex.props(styles.guide)}
					style={{ left: i * INDENT + CHEVRON_CENTER }}
				/>
			))}
			<div
				{...stylex.props(
					moving && styles.indentMoving,
					entered && styles.entered,
				)}
				style={{ paddingLeft: depth * INDENT }}
			>
				<ItemContext.Provider value={row}>
					<DragHandleContext.Provider value={dnd.handle}>
						{children(row)}
					</DragHandleContext.Provider>
				</ItemContext.Provider>
			</div>
		</li>
	);
}

export interface VirtualListProps {
	/** The visible rows. The dragged row's descendants are hidden while dragging. */
	rows: Row[];
	children: RowRenderer;
	/** Row height guess before measurement, in px. */
	estimateSize?: number;
	overscan?: number;
	/** Parent of the rows, e.g. the zoomed node. Defaults to the top-level root. */
	rootId?: string | null;
	onMove?: MoveHandler;
	/** Accessible name of the list. */
	"aria-label"?: string;
}

export function VirtualList({
	rows: allRows,
	children,
	estimateSize = 32,
	overscan = 8,
	rootId = null,
	onMove,
	"aria-label": ariaLabel,
}: VirtualListProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const dnd = useOutlineDnd({
		rows: allRows,
		rootId,
		onMove,
	});
	const { rows, projection } = dnd;
	const reflow = useReflow(rows, rootId);

	const virtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => estimateSize,
		getItemKey: (index) => rows[index].node.id,
		overscan,
		scrollMargin: parentRef.current?.offsetTop ?? 0,
	});

	const virtualItems = virtualizer.getVirtualItems();
	const scrollMargin = virtualizer.options.scrollMargin;
	const overItem = projection
		? virtualItems.find(
				(item) => rows[item.index]?.node.id === projection.overId,
			)
		: undefined;

	return (
		<DndContext {...dnd.contextProps}>
			<div
				ref={parentRef}
				{...stylex.props(styles.viewport)}
				style={{ height: virtualizer.getTotalSize() }}
			>
				<ul
					aria-label={ariaLabel}
					data-testid="outliner-list"
					{...stylex.props(styles.list)}
				>
					{virtualItems.map((item) => (
						<VirtualRow
							key={rows[item.index].node.id}
							item={item}
							row={rows[item.index]}
							virtualizer={virtualizer}
							moving={reflow.moving}
							entered={reflow.entered.has(rows[item.index].node.id)}
						>
							{children}
						</VirtualRow>
					))}
				</ul>
				{projection && overItem && (
					<DropIndicator
						projection={projection}
						overStart={overItem.start - scrollMargin}
						overEnd={overItem.end - scrollMargin}
					/>
				)}
			</div>
			<DragGhost row={dnd.activeRow}>{children}</DragGhost>
		</DndContext>
	);
}
