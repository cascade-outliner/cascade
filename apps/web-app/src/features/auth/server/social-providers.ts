import { createServerFn } from "@tanstack/react-start";
import { auth } from "@/features/auth/server/auth";

export interface EnabledSocialProviders {
	google: boolean;
}

// Reads directly off the configured auth instance (rather than duplicating
// the client-id/secret env check) so this can never drift from what
// createAuth actually wired up in packages/auth/src/server.ts.
export const getEnabledSocialProviders = createServerFn({
	method: "GET",
}).handler(
	(): EnabledSocialProviders => ({
		google: Boolean(auth.options.socialProviders?.google),
	}),
);
