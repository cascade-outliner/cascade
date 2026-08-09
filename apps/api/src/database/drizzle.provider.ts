import type { Provider } from "@nestjs/common";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const DRIZZLE = Symbol("DRIZZLE");

export type DrizzleClient = ReturnType<typeof drizzle>;

export const drizzleProvider: Provider = {
	provide: DRIZZLE,
	useFactory: (): DrizzleClient => {
		const connectionString = process.env.DATABASE_URL;
		if (!connectionString) {
			throw new Error("DATABASE_URL environment variable is required");
		}

		const client = postgres(connectionString, {
			connection: { statement_timeout: 30_000 },
		});
		return drizzle(client);
	},
};
