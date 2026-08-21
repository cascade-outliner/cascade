import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const applicationEnv = createEnv({
	server: {
		DATABASE_URL_APPLICATION: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(1),
		BETTER_AUTH_URL: z.string().min(1),
	},
	runtimeEnv: process.env,
});
