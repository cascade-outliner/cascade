import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "#schema";

const productionOrigins = [
	"https://cascadelist.com",
	"https://app.cascadelist.com",
];
const devOrigins = ["http://localhost:3000", "http://localhost:3001"];

export interface CreateAuthHooks {
	onUserCreated?: (user: { id: string }) => Promise<void>;
}

export function createAuth(db: object | string, hooks: CreateAuthHooks = {}) {
	const resolvedDb =
		typeof db === "string" ? drizzle(postgres(db), { schema }) : db;

	return betterAuth({
		baseURL: process.env.BETTER_AUTH_URL,
		secret: process.env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(resolvedDb, { provider: "pg", schema }),
		emailAndPassword: {
			enabled: true,
		},
		user: {
			deleteUser: {
				enabled: true,
			},
		},
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						await hooks.onUserCreated?.(user);
					},
				},
			},
		},
		socialProviders: {
			...(process.env.BETTER_AUTH_GOOGLE_CLIENT_ID &&
				process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET && {
					google: {
						clientId: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID,
						clientSecret: process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
					},
				}),
		},
		// Plaintext-HTTP localhost origins are only trustworthy in dev.
		trustedOrigins:
			process.env.NODE_ENV === "production"
				? productionOrigins
				: [...devOrigins, ...productionOrigins],
		advanced: {
			...(process.env.COOKIE_DOMAIN && {
				crossSubDomainCookies: {
					enabled: true,
					domain: process.env.COOKIE_DOMAIN,
				},
			}),
		},
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
