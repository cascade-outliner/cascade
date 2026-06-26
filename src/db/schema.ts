import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { type AnyPgColumn, pgTable, real, text } from "drizzle-orm/pg-core";

export const nodes = pgTable("nodes", {
	id: text().primaryKey(),
	parentId: text("parent_id").references((): AnyPgColumn => nodes.id),
	position: real().notNull(),
	text: text().notNull(),
});

export type NodeType = InferSelectModel<typeof nodes>;
export type NodeInsertType = InferInsertModel<typeof nodes>;
export type TreeNode = NodeType & { children: TreeNode[] };
