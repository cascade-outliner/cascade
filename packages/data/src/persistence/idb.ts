import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import type { NodeSnapshot, RootOrder } from "../types.ts";

const DATABASE_NAME = "cascade";
const DATABASE_VERSION = 1;

export interface CascadeDB extends DBSchema {
	nodes: {
		key: string;
		value: NodeSnapshot;
		indexes: { "by-user": string };
	};
	roots: {
		key: string;
		value: RootOrder;
	};
}

let database: Promise<IDBPDatabase<CascadeDB>> | null = null;

/** Opens (once per tab) the IndexedDB database backing the node store. */
export function openDatabase(): Promise<IDBPDatabase<CascadeDB>> {
	if (!database) {
		database = openDB<CascadeDB>(DATABASE_NAME, DATABASE_VERSION, {
			upgrade(db) {
				const nodes = db.createObjectStore("nodes", { keyPath: "id" });
				nodes.createIndex("by-user", "userId");
				db.createObjectStore("roots", { keyPath: "userId" });
			},
		});
	}

	return database;
}
