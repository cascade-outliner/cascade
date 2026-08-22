import { applicationEnv } from "@cascade/env/application";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { authSchema } from "./auth.ts";
import { nodes } from "./nodes.ts";

const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
	new URL(applicationEnv.DATABASE_URL_APPLICATION).hostname,
);

const client = postgres(applicationEnv.DATABASE_URL_APPLICATION, {
	// Many managed Postgres providers terminate TLS with a certificate that
	// isn't in Node's default CA trust store, which makes strict verification
	// (the driver/libpq default, and what a stray PGSSLMODE=verify-full picks)
	// fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE. "require" keeps the
	// connection encrypted without enforcing certificate-chain verification.
	// Local Postgres instances typically don't speak TLS at all, so leave
	// those alone.
	ssl: isLocalHost ? false : "require",
});

export const db = drizzle(client, { schema: { ...authSchema, nodes } });

export * from "./auth.ts";
export * from "./nodes.ts";
