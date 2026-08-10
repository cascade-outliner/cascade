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

/**
 * Copied from apps/web-app/src/features/tree-history/server/tree-history-table.ts
 * (see MIGRATION.md's Phase 1). `kind`/`payload`/`type`/`metadata`/`recurrence`
 * are typed loosely here rather than importing apps/web-app's
 * TreeHistoryEventKind/TreeHistoryPayload/NodeTypeName/NodeMetadata/
 * RecurrenceRule types: those live behind the tree-history feature's domain
 * model, which Phase 4 (modules/tree-history) ports along with the
 * procedures that actually branch on them. modules/maintenance only ever
 * selects/deletes by `id`/`createdAt`, so it doesn't need that precision —
 * the column names/types/indexes below match the source table exactly,
 * which is what matters for querying the real Postgres table correctly.
 *
 * `userId` also skips `@cascade/auth/schema`'s `.references(() => user.id)`
 * builder that apps/web-app's copy has: apps/api's DrizzleClient and
 * `@cascade/auth/schema`'s tables are typed against drizzle-orm's ESM vs.
 * CJS declaration files respectively (apps/api is `"type": "commonjs"`,
 * `@cascade/auth` is `"type": "module"`), which TypeScript treats as
 * structurally incompatible `Column` classes for FK-builder purposes. The
 * FK constraint itself still exists in Postgres — it's owned by
 * apps/web-app's migration history per MIGRATION.md, so this copy never
 * needed to declare it for `drizzle-kit` to pick up in the first place.
 */
export const treeHistoryEvents = pgTable(
	"tree_history_events",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		userId: text("user_id").notNull(),
		kind: text().notNull(),
		nodeId: text("node_id"),
		payload: jsonb().notNull(),
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
		type: text().notNull(),
		metadata: jsonb("metadata"),
		expanded: boolean().notNull(),
		order: text().notNull(),
		dueDate: date("due_date", { mode: "string" }),
		dueTime: text("due_time"),
		recurrence: jsonb("recurrence"),
		icon: text(),
		tags: jsonb().notNull().$type<string[]>(),
		depth: integer().notNull(),
		isRoot: boolean("is_root").notNull(),
	},
	(t) => [
		index("tree_history_snapshots_event_idx").on(t.eventId),
		index("tree_history_snapshots_node_idx").on(t.nodeId),
	],
);
