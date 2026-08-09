import { createAuth } from "@cascade/auth/server";
import type { Provider } from "@nestjs/common";

export const AUTH = Symbol("AUTH");

export type AuthInstance = ReturnType<typeof createAuth>;

/**
 * Constructs its own createAuth(...) from DATABASE_URL rather than reusing
 * DatabaseModule's Drizzle client — createAuth accepts a raw connection
 * string, so this module can be developed/tested independently of
 * DatabaseModule (see issue #684).
 */
export const authProvider: Provider = {
	provide: AUTH,
	useFactory: (): AuthInstance => {
		const connectionString = process.env.DATABASE_URL;
		if (!connectionString) {
			throw new Error("DATABASE_URL environment variable is required");
		}

		return createAuth(connectionString);
	},
};
