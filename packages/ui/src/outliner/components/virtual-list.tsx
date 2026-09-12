import type { OutlineNode } from "@cascade/data";
import { colors } from "@cascade/theme/tokens.stylex";
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragMoveEvent,
	DragOverlay,
	type DragStartEvent,
	getClientRect,
	KeyboardSensor,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import * as stylex from "@stylexjs/stylex";
import {
	useWindowVirtualizer,
	type VirtualItem,
	type Virtualizer,
} from "@tanstack/react-virtual";
import { useCallback, useMemo, useRef, useState } from "react";
import { DragHandleContext, ItemContext } from "../context";

const INDENT = 12;
const ROW_GAP = 4;
const ROW_INSET = 10;

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
		paddingBottom: ROW_GAP,
		transition: "opacity 0.1s ease-in-out",
	},
	dragging: {
		opacity: 0.3,
	},
	indicator: {
		position: "absolute",
		top: 0,
		left: 0,
		height: 2,
		borderRadius: 1,
		backgroundColor: colors.primary,
		pointerEvents: "none",
		zIndex: 1,
		"::before": {
			content: "",
			position: "absolute",
			left: -4,
			top: -3,
			width: 8,
			height: 8,
			borderRadius: "50%",
			backgroundColor: colors.primary,
		},
	},
	overlay: {
		cursor: "grabbing",
		opacity: 0.85,
	},
});

interface FlatNode {
	node: OutlineNode;
	depth: number;
}

function flatten(
	nodes: OutlineNode[],
	depth: number,
	out: FlatNode[],
	skipChildrenOf: string | null,
) {
	for (const node of nodes) {
		out.push({ node, depth });
		if (
			node.children.length > 0 &&
			!node.collapsed &&
			node.id !== skipChildrenOf
		) {
			flatten(node.children, depth + 1, out, skipChildrenOf);
		}
	}
	return out;
}

interface Projection {
	overId: string;
	before: boolean;
	depth: number;
	parentId: string | null;
	index: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function project(
	rows: FlatNode[],
	overId: string,
	before: boolean,
	activeDepth: number,
	deltaX: number,
): Projection | null {
	const overIndex = rows.findIndex((row) => row.node.id === overId);
	if (overIndex < 0) {
		return null;
	}
	const gap = before ? overIndex : overIndex + 1;
	const prev = rows[gap - 1];
	const next = rows[gap];
	const maxDepth = prev ? prev.depth + 1 : 0;
	const minDepth = next ? next.depth : 0;
	const depth = clamp(
		activeDepth + Math.round(deltaX / INDENT),
		minDepth,
		maxDepth,
	);

	let parent: FlatNode | null = null;
	let index = 0;
	for (let i = gap - 1; i >= 0; i--) {
		const row = rows[i];
		if (row.depth === depth) {
			index++;
		} else if (row.depth < depth) {
			parent = row;
			break;
		}
	}
	if (parent?.node.collapsed) {
		index = parent.node.children.length;
	}

	return { overId, before, depth, parentId: parent?.node.id ?? null, index };
}

function sameProjection(a: Projection | null, b: Projection | null) {
	if (a === b) return true;
	if (!a || !b) return false;
	return (
		a.overId === b.overId &&
		a.before === b.before &&
		a.depth === b.depth &&
		a.parentId === b.parentId &&
		a.index === b.index
	);
}

interface VirtualRowProps {
	item: VirtualItem;
	row: FlatNode;
	virtualizer: Virtualizer<Window, Element>;
	children: (node: OutlineNode, depth: number) => React.ReactNode;
}

function VirtualRow({ item, row, virtualizer, children }: VirtualRowProps) {
	const { node, depth } = row;
	const draggable = useDraggable({ id: node.id, data: { depth } });
	const droppable = useDroppable({
		id: node.id,
		disabled: draggable.isDragging,
	});
	const setDraggableRef = draggable.setNodeRef;
	const setDroppableRef = droppable.setNodeRef;
	const setRef = useCallback(
		(element: HTMLDivElement | null) => {
			virtualizer.measureElement(element);
			setDraggableRef(element);
			setDroppableRef(element);
		},
		[virtualizer, setDraggableRef, setDroppableRef],
	);
	const handle = useMemo(
		() => ({
			attributes: draggable.attributes,
			listeners: draggable.listeners,
			setActivatorNodeRef: draggable.setActivatorNodeRef,
			isDragging: draggable.isDragging,
		}),
		[
			draggable.attributes,
			draggable.listeners,
			draggable.setActivatorNodeRef,
			draggable.isDragging,
		],
	);

	return (
		<div
			ref={setRef}
			data-index={item.index}
			{...stylex.props(styles.row, draggable.isDragging && styles.dragging)}
			style={{
				paddingLeft: depth * INDENT,
				transform: `translateY(${
					item.start - virtualizer.options.scrollMargin
				}px)`,
			}}
		>
			<ItemContext.Provider value={{ node, depth }}>
				<DragHandleContext.Provider value={handle}>
					{children(node, depth)}
				</DragHandleContext.Provider>
			</ItemContext.Provider>
		</div>
	);
}

export interface VirtualListProps {
	nodes: OutlineNode[];
	children: (node: OutlineNode, depth: number) => React.ReactNode;
	/** Row height guess before measurement, in px. */
	estimateSize?: number;
	overscan?: number;
	onMove?: (id: string, parentId: string | null, index: number) => void;
}

export function VirtualList({
	nodes,
	children,
	estimateSize = 32,
	overscan = 8,
	onMove,
}: VirtualListProps) {
	const parentRef = useRef<HTMLDivElement>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [projection, setProjection] = useState<Projection | null>(null);
	const projectionRef = useRef<Projection | null>(null);

	const rows = useMemo(
		() => flatten(nodes, 0, [], activeId),
		[nodes, activeId],
	);
	const dropRows = useMemo(
		() => (activeId ? rows.filter((row) => row.node.id !== activeId) : rows),
		[rows, activeId],
	);
	const activeRow = activeId
		? (rows.find((row) => row.node.id === activeId) ?? null)
		: null;

	const virtualizer = useWindowVirtualizer({
		count: rows.length,
		estimateSize: () => estimateSize,
		overscan,
		scrollMargin: parentRef.current?.offsetTop ?? 0,
	});

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: (event, { currentCoordinates }) => {
				const { x, y } = currentCoordinates;
				switch (event.code) {
					case "ArrowRight":
						return { x: x + INDENT, y };
					case "ArrowLeft":
						return { x: x - INDENT, y };
					case "ArrowDown":
						return { x, y: y + estimateSize };
					case "ArrowUp":
						return { x, y: y - estimateSize };
				}
				return undefined;
			},
		}),
	);

	const updateProjection = (next: Projection | null) => {
		if (!sameProjection(projectionRef.current, next)) {
			projectionRef.current = next;
			setProjection(next);
		}
	};

	const reset = () => {
		setActiveId(null);
		updateProjection(null);
	};

	const handleDragStart = ({ active }: DragStartEvent) => {
		setActiveId(String(active.id));
	};

	const handleDragMove = ({ active, over, delta }: DragMoveEvent) => {
		const rect = active.rect.current.translated;
		if (!over || !rect || !activeRow) {
			updateProjection(null);
			return;
		}
		const before =
			rect.top + rect.height / 2 < over.rect.top + over.rect.height / 2;
		updateProjection(
			project(dropRows, String(over.id), before, activeRow.depth, delta.x),
		);
	};

	const handleDragEnd = ({ active }: DragEndEvent) => {
		const target = projectionRef.current;
		reset();
		if (target) {
			onMove?.(String(active.id), target.parentId, target.index);
		}
	};

	const virtualItems = virtualizer.getVirtualItems();
	const scrollMargin = virtualizer.options.scrollMargin;
	const indicatorItem = projection
		? virtualItems.find(
				(item) => rows[item.index]?.node.id === projection.overId,
			)
		: undefined;
	const indicatorY = indicatorItem
		? (projection?.before
				? indicatorItem.start
				: indicatorItem.end - ROW_GAP / 2) - scrollMargin
		: null;

	return (
		<DndContext
			id="outliner-dnd"
			sensors={sensors}
			collisionDetection={closestCenter}
			measuring={{
				draggable: { measure: getClientRect },
				droppable: { measure: getClientRect },
			}}
			onDragStart={handleDragStart}
			onDragMove={handleDragMove}
			onDragEnd={handleDragEnd}
			onDragCancel={reset}
		>
			<div
				ref={parentRef}
				{...stylex.props(styles.viewport)}
				style={{ height: virtualizer.getTotalSize() }}
			>
				{virtualItems.map((item) => {
					const row = rows[item.index];
					return (
						<VirtualRow
							key={row.node.id}
							item={item}
							row={row}
							virtualizer={virtualizer}
						>
							{children}
						</VirtualRow>
					);
				})}
				{projection && indicatorY !== null && (
					<div
						{...stylex.props(styles.indicator)}
						style={{
							left: projection.depth * INDENT + ROW_INSET,
							right: ROW_INSET,
							transform: `translateY(${indicatorY - 1}px)`,
						}}
					/>
				)}
			</div>
			<DragOverlay dropAnimation={null}>
				{activeRow && (
					<div
						{...stylex.props(styles.overlay)}
						style={{
							paddingLeft: activeRow.depth * INDENT,
							paddingBottom: ROW_GAP,
						}}
					>
						<ItemContext.Provider
							value={{ node: activeRow.node, depth: activeRow.depth }}
						>
							{children(activeRow.node, activeRow.depth)}
						</ItemContext.Provider>
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}
