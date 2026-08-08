import { user } from "@cascade/auth/schema";
import type { NodeColorName } from "@cascade/outliner/node-color";
import type { PriorityName } from "@cascade/outliner/node-priority";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import type { RecurrenceRule } from "@cascade/outliner/recurrence";
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
 * A user's custom statuses (#576): user-defined, single-select per node,
 * beyond the binary task completion. Mirrors `tags`, except a node points at
 * one status by FK rather than through a join table.
 *
 * Statuses are scoped per board (`boardId`, added alongside board custom
 * options): each board node owns its own independent set of status rows, so
 * creating/hiding/deleting a status on one board never affects another.
 * `boardId` stays nullable at the DB level only for rows created before this
 * scoping existed — those are inert (nothing queries with `boardId: null`
 * going forward); the API layer requires `boardId` on every new status.
 */
export const statuses = pgTable(
	"statuses",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		/** The board (a node with `isBoard: true`) this status belongs to. */
		boardId: text("board_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),
		name: text("name").notNull(),
		/** A palette key from `@cascade/outliner/node-statuses`' STATUS_COLORS. */
		color: text("color").notNull().default("sky"),
		/** Display order within the board's status list; creation order by default. */
		sortOrder: integer("sort_order").notNull().default(0),
		/**
		 * Hidden statuses don't render as a board column or appear in the "set
		 * status" picker, but nodes already assigned to one keep it — cards
		 * fold into the unassigned column until the status is unhidden.
		 */
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
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		content: jsonb("content"),
		searchText: text("search_text").notNull().default(""),
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
		 * An optional local wall-clock time (`HH:MM`) paired with `dueDate` that
		 * turns the day into a specific moment, e.g. for real-time due-date
		 * notifications (#599). `null` means an all-day due date, unchanged from
		 * the pre-#599 behavior.
		 */
		dueTime: text("due_time"),
		recurrence: jsonb("recurrence").$type<RecurrenceRule>(),
		/** A single emoji used as this node's custom icon (see #557). */
		icon: text(),
		/** A named color label for at-a-glance visual categorization (see #656). */
		color: text().$type<NodeColorName>(),
		/**
		 * A fixed priority level (`low`/`medium`/`high`/`urgent`), or `null`
		 * for no priority (see #576). Top-level rather than inside `metadata`
		 * because `metadata` is type-scoped to `task` and any node type can
		 * carry a priority — the same reason `dueDate` lives here.
		 */
		priority: text().$type<PriorityName>(),
		/**
		 * The user-defined status this node is in, or `null` (see #576).
		 * `set null` rather than cascade: deleting a status must not delete
		 * the nodes that were in it, just clear them.
		 */
		statusId: text("status_id").references(() => statuses.id, {
			onDelete: "set null",
		}),
		/**
		 * Whether this node's own detail page renders its direct children as
		 * a status-grouped board instead of the tree (see #455) — an explicit
		 * per-node choice ("convert this node into a board"), not a session
		 * view toggle every node gets.
		 */
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
