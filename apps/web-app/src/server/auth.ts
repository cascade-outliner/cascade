import { schema } from "@cascade/db";
import { authEnv } from "@cascade/env/auth";
import { dbEnv } from "@cascade/env/db";
import { getRequest } from "@tanstack/react-start/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db.ts";

export interface SessionUser {
	id: string;
	name: string;
	email: string;
	image: string | null;
}

export type Auth = ReturnType<typeof createAuth>;

let auth: Auth | null | undefined;

function createAuth(db: NonNullable<ReturnType<typeof getDb>>) {
	return betterAuth({
		database: drizzleAdapter(db, { provider: "pg", schema }),
		secret: authEnv.BETTER_AUTH_SECRET,
		baseURL: authEnv.BETTER_AUTH_URL,
		socialProviders: {
			google: {
				clientId: authEnv.GOOGLE_CLIENT_ID ?? "",
				clientSecret: authEnv.GOOGLE_CLIENT_SECRET ?? "",
			},
		},
	});
}

/** The env vars sign-in needs that are unset. Empty when sign-in is configured. */
export function missingAuthEnv(): string[] {
	const missing: string[] = [];
	if (!dbEnv.DATABASE_URL) {
		missing.push("DATABASE_URL");
	}
	if (!authEnv.BETTER_AUTH_SECRET) {
		missing.push("BETTER_AUTH_SECRET");
	}
	if (!authEnv.GOOGLE_CLIENT_ID) {
		missing.push("GOOGLE_CLIENT_ID");
	}
	if (!authEnv.GOOGLE_CLIENT_SECRET) {
		missing.push("GOOGLE_CLIENT_SECRET");
	}
	return missing;
}

/** The auth instance, or `null` when the database or Google credentials are missing. */
export function getAuth(): Auth | null {
	if (auth === undefined) {
		const db = getDb();
		const missing = missingAuthEnv();
		if (db !== null && missing.length === 0) {
			auth = createAuth(db);
		} else {
			auth = null;
			const all = missing.length === 4;
			console.info(
				all
					? "Sign-in and sync are off: the app stays local (set DATABASE_URL and the BETTER_AUTH_*/GOOGLE_* variables to enable them)"
					: `Sign-in and sync are off: missing ${missing.join(", ")}`,
			);
		}
	}
	return auth;
}

/** The signed-in user for the current request, or `null`. */
export async function getSessionUser(): Promise<SessionUser | null> {
	const instance = getAuth();
	if (!instance) {
		return null;
	}
	const session = await instance.api.getSession({
		headers: getRequest().headers,
	});
	if (!session) {
		return null;
	}
	const { id, name, email, image } = session.user;
	return { id, name, email, image: image ?? null };
}

export async function requireUser(): Promise<SessionUser> {
	const user = await getSessionUser();
	if (!user) {
		throw new Error("Not signed in");
	}
	return user;
}
