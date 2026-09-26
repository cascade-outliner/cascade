import {
	bigint,
	boolean,
	index,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import type { SerializedEditorState } from "lexical";

export const workspaces = pgTable("workspaces", {
	id: text("id").primaryKey(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
});

export const nodes = pgTable(
	"nodes",
	{
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		id: text("id").notNull(),
		parentId: text("parent_id"),
		order: text("order").notNull(),
		content: jsonb("content").$type<SerializedEditorState>().notNull(),
		collapsed: boolean("collapsed").notNull().default(false),
		task: jsonb("task").$type<{ done: boolean }>(),
		updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
		deletedAt: bigint("deleted_at", { mode: "number" }),
		syncedAt: timestamp("synced_at", { withTimezone: true, mode: "string" })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.workspaceId, table.id] }),
		index("nodes_workspace_synced_idx").on(table.workspaceId, table.syncedAt),
	],
);

export type NodeRow = typeof nodes.$inferSelect;
export type NewNodeRow = typeof nodes.$inferInsert;
export type WorkspaceRow = typeof workspaces.$inferSelect;
