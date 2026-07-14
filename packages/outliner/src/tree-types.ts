import type { TypedMetadata, VisibleNodeRow } from "./node-types";
import type { MoveTarget } from "./virtual-tree/visible-rows";

/**
 * Data + mutation contract VirtualTree renders against. The real app backs
 * this with oRPC + TanStack Query (see apps/app's use-visible-tree.ts); a
 * demo can back it with plain in-memory state instead.
 */
export interface VisibleTree {
	rows: VisibleNodeRow[];
	hasMore: boolean;
	toggle: (
		id: string,
		expanded: boolean,
		commit?: (splice: () => void) => void,
	) => void | Promise<void>;
	move: (
		id: string,
		target: MoveTarget,
		options?: { expandParentId?: string },
	) => void | Promise<void>;
	remove: (
		id: string,
		commit?: (splice: () => void) => void,
	) => void | Promise<void>;
	updateContent: (
		id: string,
		content: { root: unknown },
	) => void | Promise<void>;
	setType: (id: string, typed: TypedMetadata) => void | Promise<void>;
	setDueDate: (id: string, dueDate: Date | null) => void | Promise<void>;
	add: (commit?: (splice: () => void) => void) => Promise<string>;
	addAfter: (
		afterId: string,
		commit?: (splice: () => void) => void,
	) => Promise<string>;
	loadMore: () => void | Promise<void>;
}
