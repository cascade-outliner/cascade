import type { FlatNode } from "../flatten";
import { INDENT } from "../layout";

export interface Projection {
	overId: string;
	before: boolean;
	depth: number;
	parentId: string | null;
	index: number;
}

export interface ProjectionInput {
	rows: FlatNode[];
	overId: string;
	before: boolean;
	activeDepth: number;
	deltaX: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function project({
	rows,
	overId,
	before,
	activeDepth,
	deltaX,
}: ProjectionInput): Projection | null {
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

export function sameProjection(
	a: Projection | null,
	b: Projection | null,
): boolean {
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
