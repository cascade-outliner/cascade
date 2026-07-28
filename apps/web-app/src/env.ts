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
		// Deliberately not TREE_HISTORY_RETENTION_DAYS: deletion receipts back
		// immediate undo for every user, not premium's durable history feature,
		// and are purged on their own, much shorter schedule. See
		// docs/research/535-node-deletion-lifecycle.md.
		NODE_DELETION_RECEIPT_TTL_MINUTES: z.coerce
			.number()
			.int()
			.positive()
			.default(30),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
