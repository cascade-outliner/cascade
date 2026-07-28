import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.url(),
		PORT: z.coerce.number().int().positive().default(3000),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		COOKIE_DOMAIN: z.string().optional(),
		TREE_HISTORY_PURGE_TOKEN: z.string().min(32).optional(),
		TREE_HISTORY_RETENTION_DAYS: z.coerce
			.number()
			.int()
			.nonnegative()
			.default(30),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
