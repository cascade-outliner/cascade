import type { InferSelectModel } from "drizzle-orm";
import type { nodes } from "#/core/nodes/node.schema";

export type NodeType = Pick<
	InferSelectModel<typeof nodes>,
	"id" | "parentId" | "content" | "expanded" | "order"
> & {
	hasChildren: boolean;
};

/** One row of the flattened, depth-first visible tree (see nodes.visibleTree). */
export interface VisibleNodeRow {
	id: string;
	parentId: string | null;
	content: unknown;
	expanded: boolean;
	order: string;
	depth: number;
	/** Fractional-index orders from the query root down to this node; DFS sort key. */
	path: string[];
	hasChildren: boolean;
	isLastChild: boolean;
}
