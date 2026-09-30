import { openCascadeDb } from "@cascade/data";

type CascadeDb = ReturnType<typeof openCascadeDb>;

let db: CascadeDb | undefined;

export function cascadeDb(): CascadeDb {
	db ??= openCascadeDb();
	return db;
}
