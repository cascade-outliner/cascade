import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
	type AnySQLiteColumn,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const nodes = sqliteTable("nodes", {
	id: text().primaryKey(),
	parentId: text("parent_id").references((): AnySQLiteColumn => nodes.id),
	position: real().notNull(),
	text: text().notNull(),
});

export type NodeType = InferSelectModel<typeof nodes>;
export type NodeInsertType = InferInsertModel<typeof nodes>;
