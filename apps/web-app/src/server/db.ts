import { createDb, type Db } from "@cascade/db";
import { dbEnv } from "@cascade/env/db";

let db: Db | null | undefined;

export function getDb(): Db | null {
	if (db === undefined) {
		db = dbEnv.DATABASE_URL ? createDb(dbEnv.DATABASE_URL) : null;
	}
	return db;
}
