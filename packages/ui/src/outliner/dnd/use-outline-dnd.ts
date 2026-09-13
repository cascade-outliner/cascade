import type { OutlineNode } from "@cascade/data";
import {
	closestCenter,
	type DndContextProps,
	type DragEndEvent,
	type DragMoveEvent,
	type DragStartEvent,
	getClientRect,
} from "@dnd-kit/core";
import { useMemo, useRef, useState } from "react";
import { type FlatNode, flatten } from "../flatten";
import { type Projection, project, sameProjection } from "./projection";
import { useOutlineSensors } from "./sensors";

export type MoveHandler = (
	id: string,
	parentId: string | null,
	index: number,
) => void;

export interface OutlineDndOptions {
	nodes: OutlineNode[];
	rowStep: number;
	/** Parent of the rows in `nodes`, e.g. the zoomed node. Defaults to the top-level root. */
	rootId?: string | null;
	onMove?: MoveHandler;
}

export interface OutlineDnd {
	rows: FlatNode[];
	activeRow: FlatNode | null;
	projection: Projection | null;
	contextProps: DndContextProps;
}

const measuring: DndContextProps["measuring"] = {
	draggable: { measure: getClientRect },
	droppable: { measure: getClientRect },
};

export function useOutlineDnd({
	nodes,
	rowStep,
	rootId = null,
	onMove,
}: OutlineDndOptions): OutlineDnd {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [projection, setProjection] = useState<Projection | null>(null);
	const projectionRef = useRef<Projection | null>(null);
	const sensors = useOutlineSensors(rowStep);

	const rows = useMemo(() => flatten(nodes, activeId), [nodes, activeId]);
	const dropRows = useMemo(
		() => (activeId ? rows.filter((row) => row.node.id !== activeId) : rows),
		[rows, activeId],
	);
	const activeRow = activeId
		? (rows.find((row) => row.node.id === activeId) ?? null)
		: null;

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

	const onDragStart = ({ active }: DragStartEvent) => {
		setActiveId(String(active.id));
	};

	const onDragMove = ({ active, over, delta }: DragMoveEvent) => {
		const rect = active.rect.current.translated;
		if (!over || !rect || !activeRow) {
			updateProjection(null);
			return;
		}
		updateProjection(
			project({
				rows: dropRows,
				overId: String(over.id),
				before:
					rect.top + rect.height / 2 < over.rect.top + over.rect.height / 2,
				activeDepth: activeRow.depth,
				deltaX: delta.x,
			}),
		);
	};

	const onDragEnd = ({ active }: DragEndEvent) => {
		const target = projectionRef.current;
		reset();
		if (target) {
			onMove?.(String(active.id), target.parentId ?? rootId, target.index);
		}
	};

	return {
		rows,
		activeRow,
		projection,
		contextProps: {
			id: "outliner-dnd",
			sensors,
			collisionDetection: closestCenter,
			measuring,
			onDragStart,
			onDragMove,
			onDragEnd,
			onDragCancel: reset,
		},
	};
}
