import { defineFeature } from "#/core/feature";
import * as schema from "./schema";

export const authFeature = defineFeature({
	name: "auth",
	description: "Email/password authentication via better-auth",
	schema,
	// Auth has no ORPC procedures — it uses better-auth's own HTTP handler at /api/auth/$
});
