import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export function createDb(url: string) {
	const client = postgres(url, { max: 5 });
	return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

export type {
	NewNodeRow,
	NodeRow,
	UserRow,
	WorkspaceRow,
} from "./schema.ts";
export {
	account,
	nodes,
	session,
	user,
	verification,
	workspaces,
} from "./schema.ts";
export { schema };
