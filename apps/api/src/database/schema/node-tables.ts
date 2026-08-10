import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	customType,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
} from "drizzle-orm/pg-core";

const collatedText = customType<{ data: string }>({
	dataType() {
		return `text COLLATE "C"`;
	},
});

/**
 * Copied from apps/web-app/src/features/nodes/server/persistence/node-tables.ts
 * per MIGRATION.md's Phase 2 — apps/web-app's copy stays the source of truth
 * for DDL (drizzle-kit) until Phase 7. The `userId` columns intentionally
 * don't carry a `references(() => user.id)` FK here: mixing @cascade/auth/
 * schema's `user` table type with apps/api's own DrizzleClient hits the same
 * ESM/CJS declaration mismatch documented in tree-history-table.ts.
 */
export const statuses = pgTable(
	"statuses",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		userId: text("user_id").notNull(),
		boardId: text("board_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),
		name: text("name").notNull(),
		color: text("color").notNull().default("sky"),
		sortOrder: integer("sort_order").notNull().default(0),
		hidden: boolean("hidden").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("statuses_user_id_board_id_name_idx").on(
			t.userId,
			t.boardId,
			t.name,
		),
		index("statuses_board_id_idx").on(t.boardId),
	],
);

export const nodes = pgTable(
	"nodes",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		parentId: text("parent_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),
		userId: text("user_id").notNull(),
		content: jsonb("content"),
		searchText: text("search_text").notNull().default(""),
		type: text().notNull().default("text"),
		metadata: jsonb("metadata"),
		expanded: boolean().notNull().default(false),
		order: collatedText("order").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		dueDate: date("due_date", { mode: "string" }),
		dueTime: text("due_time"),
		recurrence: jsonb("recurrence"),
		icon: text(),
		priority: text(),
		statusId: text("status_id").references(() => statuses.id, {
			onDelete: "set null",
		}),
		isBoard: boolean("is_board").notNull().default(false),
	},
	(t) => [
		index("nodes_parent_id_idx").on(t.parentId),
		index("nodes_parent_order_idx").on(t.parentId, t.order),
		index("nodes_user_id_idx").on(t.userId),
		index("nodes_user_due_date_idx").on(t.userId, t.dueDate),
		index("nodes_user_priority_idx").on(t.userId, t.priority),
		index("nodes_status_id_idx").on(t.statusId),
		index("nodes_search_text_trgm_idx").using(
			"gin",
			sql`${t.searchText} gin_trgm_ops`,
		),
		unique("nodes_user_parent_order_unique")
			.on(t.userId, t.parentId, t.order)
			.nullsNotDistinct(),
	],
);

export const tags = pgTable(
	"tags",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		userId: text("user_id").notNull(),
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
