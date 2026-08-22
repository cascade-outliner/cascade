import { applicationEnv } from "@cascade/env/application";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { authSchema } from "./auth.ts";
import { nodes } from "./nodes.ts";

const databaseUrl = new URL(applicationEnv.DATABASE_URL_APPLICATION);
const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
	databaseUrl.hostname,
);

// postgres.js forwards any query param it doesn't recognize to Postgres as a
// session GUC, so libpq-style ssl params (unsupported here) must be dropped
// from the URL rather than left for postgres.js to mishandle.
for (const param of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
	databaseUrl.searchParams.delete(param);
}

const client = postgres(databaseUrl.toString(), {
	ssl: isLocalhost ? false : "require",
});

export const db = drizzle(client, { schema: { ...authSchema, nodes } });

export * from "./auth.ts";
export * from "./nodes.ts";
