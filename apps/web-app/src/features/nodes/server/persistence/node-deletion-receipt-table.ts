import { user } from "@cascade/auth/schema";
import type { NodeMetadata, NodeTypeName } from "@cascade/outliner/node-types";
import type { RecurrenceRule } from "@cascade/outliner/recurrence";
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
import type { RestoreTarget } from "../../model/subtree-snapshot.schema";

/**
 * A short-lived, ungated undo receipt captured atomically with every
 * `deleteNode` call (free and premium alike) — see
 * docs/research/535-node-deletion-lifecycle.md. Deliberately separate from
 * `tree_history_events`/`tree_history_snapshots`: those stay premium-gated
 * with 30-day retention as a durable, queryable history feature; receipts
 * exist only to make *immediate* undo/redo correct and are purged well
 * before that.
 */
export const nodeDeletionReceipts = pgTable(
	"node_deletion_receipts",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		rootNodeId: text("root_node_id").notNull(),
		parentId: text("parent_id"),
		target: jsonb("target").notNull().$type<RestoreTarget>(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		consumedAt: timestamp("consumed_at", { withTimezone: true }),
	},
	(t) => [
		index("node_deletion_receipts_user_id_idx").on(t.userId),
		index("node_deletion_receipts_expires_at_idx").on(t.expiresAt),
	],
);

export const nodeDeletionReceiptSnapshots = pgTable(
	"node_deletion_receipt_snapshots",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		receiptId: text("receipt_id")
			.notNull()
			.references(() => nodeDeletionReceipts.id, { onDelete: "cascade" }),
		nodeId: text("node_id").notNull(),
		parentId: text("parent_id"),
		content: jsonb("content"),
		type: text().notNull().$type<NodeTypeName>(),
		metadata: jsonb("metadata").$type<NodeMetadata>(),
		expanded: boolean().notNull(),
		order: text().notNull(),
		dueDate: date("due_date", { mode: "string" }),
		recurrence: jsonb("recurrence").$type<RecurrenceRule>(),
		tags: jsonb().notNull().$type<string[]>(),
		depth: integer().notNull(),
		isRoot: boolean("is_root").notNull(),
	},
	(t) => [index("node_deletion_receipt_snapshots_receipt_idx").on(t.receiptId)],
);
