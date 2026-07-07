import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./auth.schema";

function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is not set`);
	}
	return value;
}

const db = drizzle(postgres(required("DATABASE_URL")), { schema });

// Set to ".cascadelist.com" in production so the session cookie spans
// cascadelist.com and app.cascadelist.com; leave unset in dev.
const cookieDomain = process.env.COOKIE_DOMAIN;

export const auth = betterAuth({
	baseURL: required("BETTER_AUTH_URL"),
	secret: required("BETTER_AUTH_SECRET"),
	database: drizzleAdapter(db, { provider: "pg", schema }),
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: [
		"http://localhost:3000",
		"http://localhost:3001",
		"https://cascadelist.com",
		"https://app.cascadelist.com",
	],
	advanced: {
		...(cookieDomain && {
			crossSubDomainCookies: {
				enabled: true,
				domain: cookieDomain,
			},
		}),
	},
});

export type Session = typeof auth.$Infer.Session;
