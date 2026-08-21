import { index, json, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const mcpOAuthClient = pgTable("mcp_oauth_client", {
	id: text("id").primaryKey(),
	clientName: text("client_name"),
	redirectUris: json("redirect_uris").$type<string[]>().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const mcpOAuthCode = pgTable(
	"mcp_oauth_code",
	{
		code: text("code").primaryKey(),
		clientId: text("client_id")
			.notNull()
			.references(() => mcpOAuthClient.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		redirectUri: text("redirect_uri").notNull(),
		codeChallenge: text("code_challenge").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		usedAt: timestamp("used_at", { withTimezone: true }),
	},
	(t) => [index("mcp_oauth_code_client_id_idx").on(t.clientId)],
);

export const mcpOAuthToken = pgTable(
	"mcp_oauth_token",
	{
		accessToken: text("access_token").primaryKey(),
		refreshToken: text("refresh_token").notNull().unique(),
		clientId: text("client_id")
			.notNull()
			.references(() => mcpOAuthClient.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("mcp_oauth_token_user_id_idx").on(t.userId)],
);

export const mcpOAuthSchema = { mcpOAuthClient, mcpOAuthCode, mcpOAuthToken };
