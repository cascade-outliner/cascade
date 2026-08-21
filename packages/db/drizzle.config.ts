import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: ["./src/auth.ts", "./src/nodes.ts", "./src/mcp-oauth.ts"],
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL_APPLICATION ?? "",
	},
});
