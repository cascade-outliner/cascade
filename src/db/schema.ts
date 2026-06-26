import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
	type AnySQLiteColumn,
	integer,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const nodes = sqliteTable("nodes", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }), // TODO: Replace this with UUID in the future
	parentId: integer("parent_id").references((): AnySQLiteColumn => nodes.id),
	position: real().notNull(),
	text: text().notNull(),
});

export type NodeType = InferSelectModel<typeof nodes>;
export type NodeInsertType = InferInsertModel<typeof nodes>;
