import { authSchema, db } from "@cascade/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		...authSchema,
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [bearer()],
});
