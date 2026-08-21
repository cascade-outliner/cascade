import { applicationEnv } from "@cascade/env/application";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { authSchema } from "./auth.ts";
import { mcpOAuthSchema } from "./mcp-oauth.ts";
import { nodes } from "./nodes.ts";

const client = postgres(applicationEnv.DATABASE_URL_APPLICATION);

export const db = drizzle(client, {
	schema: { ...authSchema, nodes, ...mcpOAuthSchema },
});

export * from "./auth.ts";
export * from "./mcp-oauth.ts";
export * from "./nodes.ts";
