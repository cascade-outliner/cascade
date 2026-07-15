import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./auth.schema";
import { env } from "./env";

const productionOrigins = [
	"https://cascadelist.com",
	"https://app.cascadelist.com",
];
const devOrigins = ["http://localhost:3000", "http://localhost:3001"];

export function createAuth(db: object | string) {
	const resolvedDb =
		typeof db === "string" ? drizzle(postgres(db), { schema }) : db;

	return betterAuth({
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(resolvedDb, { provider: "pg", schema }),
		emailAndPassword: {
			enabled: true,
		},
		user: {
			deleteUser: {
				enabled: true,
			},
		},
		socialProviders: {
			...(env.BETTER_AUTH_GITHUB_CLIENT_ID &&
				env.BETTER_AUTH_GITHUB_CLIENT_SECRET && {
					github: {
						clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
						clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
					},
				}),
			...(env.BETTER_AUTH_GOOGLE_CLIENT_ID &&
				env.BETTER_AUTH_GOOGLE_CLIENT_SECRET && {
					google: {
						clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
						clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
					},
				}),
		},
		// Plaintext-HTTP localhost origins are only trustworthy in dev.
		trustedOrigins:
			env.NODE_ENV === "production"
				? productionOrigins
				: [...devOrigins, ...productionOrigins],
		advanced: {
			...(env.COOKIE_DOMAIN && {
				crossSubDomainCookies: {
					enabled: true,
					domain: env.COOKIE_DOMAIN,
				},
			}),
		},
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
