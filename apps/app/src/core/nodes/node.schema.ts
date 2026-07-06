import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	customType,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import type { NodeTypeName } from "@/core/nodes/node-types";

const tsvector = customType<{ data: string }>({
	dataType() {
		return "tsvector";
	},
});

export const nodes = pgTable(
	"nodes",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		parentId: text("parent_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),
		content: jsonb("content"),
		type: text().notNull().default("text").$type<NodeTypeName>(),
		metadata: jsonb("metadata"),
		expanded: boolean().notNull().default(false),
		// Must use COLLATE "C" in the database (applied via one-off SQL; drizzle
		// can't declare collation) — fractional-index keys require byte-order
		// comparison or DFS path sorting silently breaks.
		order: text("order").notNull(),
		// Plain text extracted from `content` (a Lexical AST that Postgres can't
		// parse), maintained by the app on write — see updateNodeContent.
		searchText: text("search_text").notNull().default(""),
		// Derived from search_text by Postgres itself, so it's always in sync.
		searchVector: tsvector("search_vector").generatedAlwaysAs(
			sql`to_tsvector('english', coalesce(search_text, ''))`,
		),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index("nodes_parent_id_idx").on(t.parentId),
		index("nodes_parent_order_idx").on(t.parentId, t.order),
		index("nodes_search_vector_idx").using("gin", t.searchVector),
		// Trigram index for typo-tolerant/substring fallback search — the
		// gin_trgm_ops operator class requires the pg_trgm extension, added by
		// hand to the generated migration (drizzle has no extension DSL).
		index("nodes_search_text_trgm_idx").using(
			"gin",
			sql`${t.searchText} gin_trgm_ops`,
		),
	],
);
