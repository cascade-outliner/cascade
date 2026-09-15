import type { Row } from "@cascade/data";
import {
	closestCenter,
	type DndContextProps,
	type DragEndEvent,
	type DragMoveEvent,
	type DragStartEvent,
	getClientRect,
} from "@dnd-kit/core";
import { useCallback, useMemo, useRef, useState } from "react";
import { type Projection, project, sameProjection } from "./projection";
import { useOutlineSensors } from "./sensors";

export type MoveHandler = (
	id: string,
	parentId: string | null,
	index: number,
) => void;

/** `rows` without the descendants of `id`: they are the contiguous deeper run right after it. */
function withoutDescendants(rows: Row[], id: string | null): Row[] {
	const start = id === null ? -1 : rows.findIndex((row) => row.node.id === id);
	if (start < 0) {
		return rows;
	}
	let end = start + 1;
	while (end < rows.length && rows[end].depth > rows[start].depth) {
		end++;
	}
	return [...rows.slice(0, start + 1), ...rows.slice(end)];
}

export interface OutlineDndOptions {
	rows: Row[];
	rowStep: number;
	/** Parent of the rows, e.g. the zoomed node. Defaults to the top-level root. */
	rootId?: string | null;
	onMove?: MoveHandler;
}

export interface OutlineDnd {
	rows: Row[];
	activeRow: Row | null;
	projection: Projection | null;
	contextProps: DndContextProps;
}

const measuring: DndContextProps["measuring"] = {
	draggable: { measure: getClientRect },
	droppable: { measure: getClientRect },
};

export function useOutlineDnd({
	rows: allRows,
	rowStep,
	rootId = null,
	onMove,
}: OutlineDndOptions): OutlineDnd {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [projection, setProjection] = useState<Projection | null>(null);
	const projectionRef = useRef<Projection | null>(null);
	const sensors = useOutlineSensors(rowStep);

	const rows = useMemo(
		() => withoutDescendants(allRows, activeId),
		[allRows, activeId],
	);
	const dropRows = useMemo(
		() => (activeId ? rows.filter((row) => row.node.id !== activeId) : rows),
		[rows, activeId],
	);
	const activeRow = activeId
		? (rows.find((row) => row.node.id === activeId) ?? null)
		: null;

	const updateProjection = useCallback((next: Projection | null) => {
		if (!sameProjection(projectionRef.current, next)) {
			projectionRef.current = next;
			setProjection(next);
		}
	}, []);

	const reset = useCallback(() => {
		setActiveId(null);
		updateProjection(null);
	}, [updateProjection]);

	const onDragStart = useCallback(({ active }: DragStartEvent) => {
		setActiveId(String(active.id));
	}, []);

	const onDragMove = useCallback(
		({ active, over, delta }: DragMoveEvent) => {
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
		},
		[dropRows, activeRow, updateProjection],
	);

	const onDragEnd = useCallback(
		({ active }: DragEndEvent) => {
			const target = projectionRef.current;
			reset();
			if (target) {
				onMove?.(String(active.id), target.parentId ?? rootId, target.index);
			}
		},
		[reset, onMove, rootId],
	);

	const contextProps = useMemo<DndContextProps>(
		() => ({
			id: "outliner-dnd",
			sensors,
			collisionDetection: closestCenter,
			measuring,
			onDragStart,
			onDragMove,
			onDragEnd,
			onDragCancel: reset,
		}),
		[sensors, onDragStart, onDragMove, onDragEnd, reset],
	);

	return {
		rows,
		activeRow,
		projection,
		contextProps,
	};
}
