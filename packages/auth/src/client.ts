import { createAuthClient } from "better-auth/react";

// Same-origin: both apps mount the better-auth handler at /api/auth/*.
export const authClient = createAuthClient();
