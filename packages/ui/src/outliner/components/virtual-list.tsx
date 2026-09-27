import { type Box, useSelectionContainer } from "@air/react-drag-to-select";
import type { Row } from "@cascade/data";
import { colors, duration, radius, space } from "@cascade/theme/tokens.stylex";
import { DndContext } from "@dnd-kit/core";
import * as stylex from "@stylexjs/stylex";
import {
	useWindowVirtualizer,
	type VirtualItem,
	type Virtualizer,
} from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef } from "react";
import { DragHandleContext, ItemContext } from "../context";
import { DragGhost } from "../dnd/drag-ghost";
import { DropIndicator } from "../dnd/drop-indicator";
import { type MoveHandler, useOutlineDnd } from "../dnd/use-outline-dnd";
import { useRowDnd } from "../dnd/use-row-dnd";
import { CHEVRON_CENTER, INDENT, ROW_GAP } from "../layout";
import { hitRows } from "../selection/hit-rows";

/** A press on these never starts a marquee: controls (the bullet is dnd-kit's handle), editors, popups. */
const NO_MARQUEE =
	'button, a, input, textarea, select, [contenteditable="true"], [role="menu"], [role="dialog"]';
/** A press inside a popup leaves the selection alone, so "Delete N nodes" still sees it. */
const IN_POPUP = '[role="menu"], [role="dialog"]';

function shouldStartSelecting(target: EventTarget | null): boolean {
	return !(target instanceof Element && target.closest(NO_MARQUEE));
}

// The library inlines its own border and background, so these must be inline too.
const marqueeStyle: React.CSSProperties = {
	border: `1px solid ${colors.primary}`,
	background: colors.primaryMuted,
	borderRadius: radius.sm,
	zIndex: 1,
};

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
	return a.size === b.size && [...a].every((id) => b.has(id));
}

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
	dragging: {
		opacity: 0.3,
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
	children: RowRenderer;
}

function VirtualRow({ item, row, virtualizer, children }: VirtualRowProps) {
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
			{...stylex.props(styles.row, dnd.isDragging && styles.dragging)}
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
			<div style={{ paddingLeft: depth * INDENT }}>
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
	/** Ids of the selected rows. Shift+drag extends it. */
	selected?: ReadonlySet<string>;
	/**
	 * Called with the new selection: the rows under the marquee while dragging,
	 * and an empty set on a plain press anywhere outside a popup.
	 */
	onSelect?: (ids: Set<string>) => void;
}

export function VirtualList({
	rows: allRows,
	children,
	estimateSize = 32,
	overscan = 8,
	rootId = null,
	onMove,
	"aria-label": ariaLabel,
	selected,
	onSelect,
}: VirtualListProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const dnd = useOutlineDnd({
		rows: allRows,
		rootId,
		onMove,
	});
	const { rows, projection } = dnd;

	const virtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => estimateSize,
		getItemKey: (index) => rows[index].node.id,
		overscan,
		scrollMargin: parentRef.current?.offsetTop ?? 0,
	});

	// Marquee: the selection at drag start (kept with shift) plus the rows under the box.
	const marqueeBase = useRef<ReadonlySet<string>>(new Set());
	const marqueeLast = useRef<ReadonlySet<string> | null>(null);
	/** Where the mouse went down, in document coordinates. */
	const pressPoint = useRef<{ x: number; y: number } | null>(null);
	const selectBox = (box: Box) => {
		const viewport = parentRef.current;
		if (!viewport || !onSelect) {
			return;
		}
		const next = new Set(marqueeBase.current);
		// Each measured row includes its bottom gap; a press in the gap must not select the row above.
		const bands = virtualizer.measurementsCache.map((item) => ({
			start: item.start,
			size: item.size - ROW_GAP,
		}));
		const hits = hitRows(
			bands,
			box,
			viewport.getBoundingClientRect(),
			window.scrollY,
		);
		for (const index of hits) {
			const row = rows[index];
			if (row) {
				next.add(row.node.id);
			}
		}
		if (!marqueeLast.current || !sameSet(next, marqueeLast.current)) {
			marqueeLast.current = next;
			onSelect(next);
		}
	};
	const { DragSelection } = useSelectionContainer({
		shouldStartSelecting,
		selectionProps: { style: marqueeStyle },
		onSelectionStart: (event) => {
			marqueeBase.current =
				event.shiftKey && selected ? new Set(selected) : new Set();
			marqueeLast.current = null;
		},
		onSelectionChange: selectBox,
		// The library reports changes a frame late and drops the pending one on
		// mouseup, so a quick release would miss the last rows. Settle from the release point.
		onSelectionEnd: (event) => {
			const press = pressPoint.current;
			if (!press) {
				return;
			}
			const x = press.x - window.scrollX;
			const y = press.y - window.scrollY;
			selectBox({
				left: Math.min(x, event.clientX),
				top: Math.min(y, event.clientY),
				width: Math.abs(x - event.clientX),
				height: Math.abs(y - event.clientY),
			});
		},
	});

	// A plain press clears the selection; a right-click keeps it on a selected row so the menu can act on it.
	useEffect(() => {
		if (!onSelect) {
			return;
		}
		const onMouseDown = (event: MouseEvent) => {
			const target = event.target instanceof Element ? event.target : null;
			if (target?.closest(IN_POPUP)) {
				return;
			}
			if (event.button === 0) {
				pressPoint.current = {
					x: event.clientX + window.scrollX,
					y: event.clientY + window.scrollY,
				};
			}
			if (event.button === 0 && !event.shiftKey) {
				onSelect(new Set());
				return;
			}
			if (event.button === 2) {
				const index = Number(
					target?.closest<HTMLElement>("[data-index]")?.dataset.index,
				);
				const id = rows[index]?.node.id;
				if (!(id && selected?.has(id))) {
					onSelect(new Set());
				}
			}
		};
		document.addEventListener("mousedown", onMouseDown, { capture: true });
		return () =>
			document.removeEventListener("mousedown", onMouseDown, {
				capture: true,
			});
	}, [onSelect, rows, selected]);

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
				<DragSelection />
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
