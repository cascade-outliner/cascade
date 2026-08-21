import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const websiteEnv = createEnv({
	server: {
		DATABASE_URL_WEBSITE: z.string().min(1),
		PAYLOAD_SECRET: z.string().min(1),
	},
	runtimeEnv: process.env,
});
