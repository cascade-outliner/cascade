import { user } from "@cascade/auth/schema";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
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
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		content: jsonb("content"),
		type: text().notNull().default("text").$type<NodeTypeName>(),
		metadata: jsonb("metadata").$type<NodeMetadata>(),
		expanded: boolean().notNull().default(false),
		order: text("order").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		dueDate: timestamp("due_date", { withTimezone: true }),
	},
	(t) => [
		index("nodes_parent_id_idx").on(t.parentId),
		index("nodes_parent_order_idx").on(t.parentId, t.order),
		index("nodes_user_id_idx").on(t.userId),
		index("nodes_user_due_date_idx").on(t.userId, t.dueDate),
	],
);
