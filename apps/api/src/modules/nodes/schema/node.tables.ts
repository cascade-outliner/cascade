import {
	type AnyPgColumn,
	boolean,
	customType,
	index,
	jsonb,
	pgTable,
	text,
	unique,
} from "drizzle-orm/pg-core";
import { uuid } from "drizzle-orm/pg-core";

const collatedText = customType<{ data: string }>({
	dataType() {
		return `text COLLATE "C"`;
	},
});

export const nodes = pgTable(
	"nodes",
	{
		id: uuid().notNull().primaryKey().defaultRandom(),
		parentId: uuid("parent_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),
		userId: text("user_id").notNull(),
		content: jsonb("content"),
		type: text().notNull().default("text"),
		metadata: jsonb("metadata"),
		expanded: boolean().notNull().default(false),
		order: collatedText("order").notNull(),
	},
	(t) => [
		index("nodes_parent_id_idx").on(t.parentId),
		index("nodes_parent_order_idx").on(t.parentId, t.order),
		index("nodes_user_id_idx").on(t.userId),
		unique("nodes_user_parent_order_unique")
			.on(t.userId, t.parentId, t.order)
			.nullsNotDistinct(),
	],
);
