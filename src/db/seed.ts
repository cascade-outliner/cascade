import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { db } from "./index.ts";
import { nodes } from "./schema.ts";

migrate(db, { migrationsFolder: "./drizzle" });

const id1 = crypto.randomUUID();
const id2 = crypto.randomUUID();
const id3 = crypto.randomUUID();
const id4 = crypto.randomUUID();

await db.insert(nodes).values([
	{ id: id1, parentId: null, position: 1, text: "Welcome to Cascade" },
	{ id: id2, parentId: id1, position: 1, text: "This is a child node" },
	{ id: id3, parentId: id1, position: 2, text: "This is another child node" },
	{ id: id4, parentId: null, position: 2, text: "A second root node" },
]);
