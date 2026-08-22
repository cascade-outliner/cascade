import { authSchema, db } from "@cascade/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		...authSchema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	trustedOrigins: ["https://app.cascadelist.com"],
});
