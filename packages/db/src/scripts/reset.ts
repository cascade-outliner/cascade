import { sql } from "drizzle-orm";
import { db } from "../index.ts";

await db.execute(sql`drop schema public cascade; create schema public;`);

process.exit(0);
