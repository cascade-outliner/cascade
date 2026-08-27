import { emptyState } from "../empty-content.ts";
import type { NodeSnapshot } from "../types.ts";
import type { Outline } from "./types.ts";

export function snap(
	over: Partial<NodeSnapshot> & { id: string },
): NodeSnapshot {
	return {
		userId: "u1",
		parentId: null,
		childIds: [],
		content: emptyState(),
		expanded: true,
		createdAt: 0,
		updatedAt: 0,
		deletedAt: null,
		...over,
	};
}

export function buildOutline(
	snaps: NodeSnapshot[],
	rootIds: string[],
): Outline {
	return {
		userId: "u1",
		nodes: new Map(snaps.map((s) => [s.id, s])),
		rootIds,
	};
}
