import type { TypedMetadata, VisibleNodeRow } from "./node-types";
import type { MoveTarget } from "./virtual-tree/visible-rows";

/**
 * Data + mutation contract VirtualTree renders against. The real app backs
 * this with oRPC + TanStack Query (see apps/web-app's use-visible-tree.ts); a
 * demo can back it with plain in-memory state instead.
 */
export interface VisibleTree {
	rows: VisibleNodeRow[];
	hasMore: boolean;
	toggle: (id: string, expanded: boolean) => void | Promise<void>;
	move: (
		id: string,
		target: MoveTarget,
		options?: { expandParentId?: string },
	) => void | Promise<void>;
	remove: (id: string) => void | Promise<void>;
	/** Copies a node and its full subtree, inserting the copy as a sibling immediately after it. */
	duplicate: (id: string) => void | Promise<void>;
	updateContent: (
		id: string,
		content: { root: unknown },
	) => void | Promise<void>;
	setType: (id: string, typed: TypedMetadata) => void | Promise<void>;
	setDueDate: (id: string, dueDate: Date | null) => void | Promise<void>;
	setTags: (id: string, tags: string[]) => void | Promise<void>;
	/** Resolves to `null` if the create fails, so callers can skip focusing a node that was never made. */
	add: (options?: AddNodeOptions) => Promise<string | null>;
	addAfter: (
		afterId: string,
		options?: AddNodeOptions,
	) => Promise<string | null>;
	loadMore: () => void | Promise<void>;
}

export interface AddNodeOptions {
	/** Stamped onto the new node at creation, e.g. to match an active due-date filter. */
	dueDate?: Date | null;
}
