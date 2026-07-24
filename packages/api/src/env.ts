import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.url(),
		TREE_HISTORY_PURGE_TOKEN: z.string().min(32).optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
