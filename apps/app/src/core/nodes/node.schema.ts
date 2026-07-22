import { user } from "@cascade/auth/schema";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	customType,
	date,
	index,
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
		/**
		 * A calendar date, not an instant: stored as Postgres `date` (no time or
		 * timezone) and represented as a plain `YYYY-MM-DD` string everywhere in
		 * the app, so the day it names never shifts under conversion. See #323.
		 */
		dueDate: date("due_date", { mode: "string" }),
		/**
		 * Soft-delete marker: set (to the same instant for the whole subtree,
		 * one UPDATE per `deleteNode` call) instead of removing the row, so a
		 * deleted node's `node_versions` survive and it can be brought back
		 * (see `restoreNodeVersion`). `NULL` means active/visible. Deleted rows
		 * are excluded from every normal read (`visibleTree`, `listNodes`,
		 * `getNode`, `resolveNodeSlug`) and from sibling-order lookups
		 * (`createNode`/`moveNode`/`duplicateNode`), so they're fully invisible
		 * until restored.
		 */
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(t) => [
		index("nodes_parent_id_idx").on(t.parentId),
		index("nodes_parent_order_idx").on(t.parentId, t.order),
		index("nodes_user_id_idx").on(t.userId),
		index("nodes_user_due_date_idx").on(t.userId, t.dueDate),
		// Deleted nodes keep their row (and `order`) around, but the
		// top-of-subtree node being deleted gets its `order` rewritten to a
		// value derived from its own id (see `deleteNode`) precisely so it
		// can never collide with this constraint once a new sibling reuses
		// that slot — descendants keep their real `order` untouched, since
		// nothing can be inserted under an invisible (deleted) parent in the
		// meantime. That means this constraint doesn't need to be scoped to
		// active rows only.
		unique("nodes_user_parent_order_unique")
			.on(t.userId, t.parentId, t.order)
			.nullsNotDistinct(),
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

/** A prior snapshot of a node's `content`, captured just before it gets
 * overwritten (see `updateNodeContent`/`restoreNodeVersion`). `userId` is
 * denormalized here (rather than requiring a join through `nodes`) so
 * version procedures can scope with a single `WHERE`, matching every other
 * node procedure. */
export const nodeVersions = pgTable(
	"node_versions",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		nodeId: text("node_id")
			.notNull()
			.references(() => nodes.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		content: jsonb("content"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("node_versions_node_id_created_at_idx").on(t.nodeId, t.createdAt),
	],
);
