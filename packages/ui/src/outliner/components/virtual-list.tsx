import type { Row } from "@cascade/data";
import { colors, duration, space } from "@cascade/theme/tokens.stylex";
import { DndContext } from "@dnd-kit/core";
import * as stylex from "@stylexjs/stylex";
import {
	useWindowVirtualizer,
	type VirtualItem,
	type Virtualizer,
} from "@tanstack/react-virtual";
import { useCallback, useRef } from "react";
import { DragHandleContext, ItemContext } from "../context";
import { DragGhost } from "../dnd/drag-ghost";
import { DropIndicator } from "../dnd/drop-indicator";
import { type MoveHandler, useOutlineDnd } from "../dnd/use-outline-dnd";
import { useRowDnd } from "../dnd/use-row-dnd";
import { CHEVRON_CENTER, INDENT } from "../layout";

const styles = stylex.create({
	viewport: {
		position: "relative",
		width: "100%",
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
		(element: HTMLDivElement | null) => {
			virtualizer.measureElement(element);
			setDndRef(element);
		},
		[virtualizer, setDndRef],
	);

	return (
		<div
			ref={setRef}
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
		</div>
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
}

export function VirtualList({
	rows: allRows,
	children,
	estimateSize = 32,
	overscan = 8,
	rootId = null,
	onMove,
}: VirtualListProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const dnd = useOutlineDnd({
		rows: allRows,
		rowStep: estimateSize,
		rootId,
		onMove,
	});
	const { rows, projection } = dnd;

	const virtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => estimateSize,
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
