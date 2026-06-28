import type { InferSelectModel } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	index,
	pgTable,
	real,
	text,
} from "drizzle-orm/pg-core";

export const nodes = pgTable(
	"nodes",
	{
		id: text().primaryKey(),
		parentId: text("parent_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),
		position: real().notNull(),
		text: text().notNull(),
		isOpen: boolean("is_open").notNull().default(false),
	},
	(t) => [index("nodes_parent_id_idx").on(t.parentId)],
);

export type NodeType = InferSelectModel<typeof nodes>;
export type NodeWithMeta = NodeType & { hasChildren: boolean };
