import { user } from "@cascade/auth/schema";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import type {
	TreeHistoryEventKind,
	TreeHistoryPayload,
} from "../model/tree-history.schema";

export const treeHistoryEvents = pgTable(
	"tree_history_events",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		kind: text().notNull().$type<TreeHistoryEventKind>(),
		nodeId: text("node_id"),
		payload: jsonb().notNull().$type<TreeHistoryPayload>(),
		restoredFromEventId: text("restored_from_event_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("tree_history_events_user_created_idx").on(
			t.userId,
			t.createdAt,
			t.id,
		),
		index("tree_history_events_created_idx").on(t.createdAt),
	],
);

export const treeHistorySnapshots = pgTable(
	"tree_history_snapshots",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		eventId: text("event_id")
			.notNull()
			.references(() => treeHistoryEvents.id, { onDelete: "cascade" }),
		phase: text().notNull().$type<"before" | "after">(),
		nodeId: text("node_id").notNull(),
		parentId: text("parent_id"),
		content: jsonb("content"),
		type: text().notNull().$type<NodeTypeName>(),
		metadata: jsonb("metadata").$type<NodeMetadata>(),
		expanded: boolean().notNull(),
		order: text().notNull(),
		dueDate: date("due_date", { mode: "string" }),
		tags: jsonb().notNull().$type<string[]>(),
		depth: integer().notNull(),
		isRoot: boolean("is_root").notNull(),
	},
	(t) => [
		index("tree_history_snapshots_event_idx").on(t.eventId),
		index("tree_history_snapshots_node_idx").on(t.nodeId),
	],
);
