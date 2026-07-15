import { createAuth } from "@cascade/auth/server";
import { env } from "#/env";

export const auth = createAuth(env.DATABASE_URL);
