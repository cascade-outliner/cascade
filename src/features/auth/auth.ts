import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "#/db";
import { account, session, user, verification } from "./schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: { user, session, account, verification },
	}),
	emailAndPassword: { enabled: true },
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.SERVER_URL ?? "http://localhost:3000",
});
