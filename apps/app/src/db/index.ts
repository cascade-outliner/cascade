import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, {
	connection: { statement_timeout: 30_000 },
});
export const db = drizzle(client, { schema });
