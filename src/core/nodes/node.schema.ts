import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const nodes = pgTable(
	"nodes",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		parentId: text("parent_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),
		content: jsonb("content"),
		expanded: boolean().notNull().default(false),
		// Must use COLLATE "C" in the database (applied via one-off SQL; drizzle
		// can't declare collation) — fractional-index keys require byte-order
		// comparison or DFS path sorting silently breaks.
		order: text("order").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index("nodes_parent_id_idx").on(t.parentId),
		index("nodes_parent_order_idx").on(t.parentId, t.order),
	],
);
