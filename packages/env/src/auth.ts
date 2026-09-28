import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const authEnv = createEnv({
	server: {
		BETTER_AUTH_SECRET: z.string().min(32).optional(),
		BETTER_AUTH_URL: z.string().url().optional(),
		GOOGLE_CLIENT_ID: z.string().min(1).optional(),
		GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
