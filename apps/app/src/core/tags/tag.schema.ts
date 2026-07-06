import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { nodes } from "@/core/nodes/node.schema";

export const tags = pgTable(
	"tags",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		parentId: text("parent_id").references((): AnyPgColumn => tags.id, {
			onDelete: "cascade",
		}),
		name: text("name").notNull(),
		color: text("color").notNull().default("#6b7280"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index("tags_parent_id_idx").on(t.parentId),
		// Case-insensitive uniqueness among sibling tags (same parent).
		uniqueIndex("tags_parent_id_name_lower_idx").on(
			t.parentId,
			sql`lower(${t.name})`,
		),
		// A composite unique index never catches duplicates among NULL parent_id
		// rows (NULL <> NULL), so root-level tags need this separate partial index.
		uniqueIndex("tags_root_name_lower_idx")
			.on(sql`lower(${t.name})`)
			.where(sql`${t.parentId} IS NULL`),
	],
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		primaryKey({ columns: [t.nodeId, t.tagId] }),
		index("node_tags_tag_id_idx").on(t.tagId),
	],
);
