import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./auth.schema";
import { env } from "./env";
import { CASCADE_API_AUDIENCE } from "./token-validation";

const productionOrigins = [
	"https://cascadelist.com",
	"https://app.cascadelist.com",
];
const devOrigins = ["http://localhost:3000", "http://localhost:3001"];

export interface CreateAuthHooks {
	/** Called once, right after a new user row is created (sign-up or first
	 * social login) — the natural hook point for first-run setup like seeding
	 * onboarding content. Not called for existing users. */
	onUserCreated?: (user: { id: string }) => Promise<void>;
}

export function createAuth(db: object | string, hooks: CreateAuthHooks = {}) {
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
		plugins: [
			jwt({
				jwks: {
					keyPairConfig: {
						alg: "EdDSA",
						crv: "Ed25519",
					},
					rotationInterval: 60 * 60 * 24 * 30, // Rotate monthly
					gracePeriod: 60 * 60 * 24 * 30, // Accept old keys for 30 days
					disablePrivateKeyEncryption: false, // Keep encrypted
				},
				jwt: {
					expirationTime: "1h", // 1 hour for reasonable API token lifetime
					issuer: env.BETTER_AUTH_URL,
					audience: CASCADE_API_AUDIENCE,
					definePayload: ({ user }) => ({
						id: user.id,
						email: user.email,
					}),
				},
			}),
		],
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];
