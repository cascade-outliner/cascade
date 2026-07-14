import { createAuth } from "@cascade/auth/server";
import { db } from "@/db";

export const auth = createAuth(db);
