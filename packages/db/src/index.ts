import { applicationEnv } from "@cascade/env/application";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { authSchema } from "./auth.ts";
import { nodes } from "./nodes.ts";

const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
	new URL(applicationEnv.DATABASE_URL_APPLICATION).hostname,
);

const client = postgres(applicationEnv.DATABASE_URL_APPLICATION, {
	ssl: isLocalhost ? false : "require",
});

export const db = drizzle(client, { schema: { ...authSchema, nodes } });

export * from "./auth.ts";
export * from "./nodes.ts";
