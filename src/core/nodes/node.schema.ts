import { type AnyPgColumn, index, pgTable, text } from "drizzle-orm/pg-core";

export const nodes = pgTable(
	"nodes",
	{
		id: text().primaryKey(),
		parentId: text("parent_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),
		text: text().notNull(),
	},
	(t) => [index("nodes_parent_id_idx").on(t.parentId)],
);
