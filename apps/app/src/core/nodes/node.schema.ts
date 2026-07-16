import { user } from "@cascade/auth/schema";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	customType,
	index,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

const collatedText = customType<{ data: string }>({
	dataType() {
		return `text COLLATE "C"`;
	},
});

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
		order: collatedText("order").notNull(),
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

export const tags = pgTable(
	"tags",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [uniqueIndex("tags_user_id_name_idx").on(t.userId, t.name)],
);

export const nodeTags = pgTable(
	"node_tags",
	{
		nodeId: text("node_id")
			.notNull()
			.references(() => nodes.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
	},
	(t) => [
		primaryKey({ columns: [t.nodeId, t.tagId] }),
		index("node_tags_tag_id_idx").on(t.tagId),
	],
);
