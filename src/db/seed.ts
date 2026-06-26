import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { db } from "./index.ts";
import { nodes } from "./schema.ts";

migrate(db, { migrationsFolder: "./drizzle" });

await db.insert(nodes).values([
	{ parentId: null, position: 1, text: "Welcome to Cascade" },
	{ parentId: 1, position: 1, text: "This is a child node" },
	{ parentId: 1, position: 2, text: "This is another child node" },
	{ parentId: null, position: 2, text: "A second root node" },
]);
