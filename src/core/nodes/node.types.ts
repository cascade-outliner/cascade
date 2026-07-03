import type { InferSelectModel } from "drizzle-orm";
import type { nodes } from "@/core/nodes/node.schema";
import type { NodeTypeName } from "@/core/nodes/node-types";

export type NodeType = Pick<
	InferSelectModel<typeof nodes>,
	"id" | "parentId" | "content" | "type" | "metadata" | "expanded" | "order"
> & {
	hasChildren: boolean;
};

/** One row of the flattened, depth-first visible tree (see nodes.visibleTree). */
export interface VisibleNodeRow {
	id: string;
	parentId: string | null;
	content: unknown;
	type: NodeTypeName;
	/** Per-type data; narrow via the `type` discriminant (see node-types.ts). */
	metadata: unknown;
	expanded: boolean;
	order: string;
	depth: number;
	/** Fractional-index orders from the query root down to this node; DFS sort key. */
	path: string[];
	hasChildren: boolean;
	isLastChild: boolean;
}
