import { and, eq } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import type { db as dbType } from "./index";

export const nodes = pgTable(
	"nodes",
	{
		id: uuid().primaryKey().defaultRandom(),
		parentId: uuid("parent_id").references((): AnyPgColumn => nodes.id, {
			onDelete: "cascade",
		}),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		content: jsonb("content"),
		expanded: boolean().notNull().default(false),
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
		index("nodes_user_id_idx").on(t.userId),
	],
);

export type NodeInput = {
	parentId?: string | null;
	content?: unknown;
	expanded?: boolean;
};

export const nodeQueries = {
	list: (db: typeof dbType, userId: string) =>
		db.select().from(nodes).where(eq(nodes.userId, userId)),

	get: async (db: typeof dbType, userId: string, id: string) => {
		const [node] = await db
			.select()
			.from(nodes)
			.where(and(eq(nodes.id, id), eq(nodes.userId, userId)));
		return node ?? null;
	},

	create: async (db: typeof dbType, userId: string, input: NodeInput) => {
		const [node] = await db
			.insert(nodes)
			.values({ ...input, userId })
			.returning();
		return node;
	},

	update: async (
		db: typeof dbType,
		userId: string,
		id: string,
		input: NodeInput,
	) => {
		const [node] = await db
			.update(nodes)
			.set(input)
			.where(and(eq(nodes.id, id), eq(nodes.userId, userId)))
			.returning();
		return node ?? null;
	},

	delete: async (db: typeof dbType, userId: string, id: string) => {
		const result = await db
			.delete(nodes)
			.where(and(eq(nodes.id, id), eq(nodes.userId, userId)))
			.returning({ id: nodes.id });
		return result.length > 0;
	},
};
