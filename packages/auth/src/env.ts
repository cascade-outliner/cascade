import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		BETTER_AUTH_URL: z.url(),
		BETTER_AUTH_SECRET: z.string().min(32),
		COOKIE_DOMAIN: z.string().optional(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		BETTER_AUTH_GITHUB_CLIENT_ID: z.string().min(1).optional(),
		BETTER_AUTH_GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
		BETTER_AUTH_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
		BETTER_AUTH_GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});

// Each OAuth provider needs both its id and secret, or neither: a lone
// value means the pair is misconfigured rather than intentionally disabled.
function assertPaired(
	idName: string,
	id: string | undefined,
	secretName: string,
	secret: string | undefined,
) {
	if (Boolean(id) !== Boolean(secret)) {
		throw new Error(
			`${idName} and ${secretName} must both be set or both be unset`,
		);
	}
}

assertPaired(
	"BETTER_AUTH_GITHUB_CLIENT_ID",
	env.BETTER_AUTH_GITHUB_CLIENT_ID,
	"BETTER_AUTH_GITHUB_CLIENT_SECRET",
	env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
);
assertPaired(
	"BETTER_AUTH_GOOGLE_CLIENT_ID",
	env.BETTER_AUTH_GOOGLE_CLIENT_ID,
	"BETTER_AUTH_GOOGLE_CLIENT_SECRET",
	env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
);
