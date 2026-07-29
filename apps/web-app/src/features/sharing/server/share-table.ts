import { user } from "@cascade/auth/schema";
import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { nodes } from "@/features/nodes/server/persistence/node-tables";

export const treeShares = pgTable(
	"tree_shares",
	{
		id: text().primaryKey().default(sql`gen_random_uuid()`),
		nodeId: text("node_id")
			.notNull()
			.references(() => nodes.id, { onDelete: "cascade" }),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		token: text("token").notNull(),
		requireLogin: boolean("require_login").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
	},
	(t) => [
		uniqueIndex("tree_shares_token_idx").on(t.token),
		index("tree_shares_node_id_idx").on(t.nodeId),
		index("tree_shares_owner_id_idx").on(t.ownerId),
	],
);
