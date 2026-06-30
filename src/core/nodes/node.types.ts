import type { InferSelectModel } from "drizzle-orm";
import type { nodes } from "#/core/nodes/node.schema";

export type NodeType = InferSelectModel<typeof nodes> & {
	hasChildren: boolean;
};
