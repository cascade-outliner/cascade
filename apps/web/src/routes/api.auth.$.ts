import { auth } from "@cascade/auth/server";
import { createFileRoute } from "@tanstack/react-router";
// Loads TanStack Start's route type augmentation for `server.handlers`.
import type {} from "@tanstack/react-start";
// Validates server env at boot; the auth instance reads the same vars.
import "#/env";

function handle({ request }: { request: Request }) {
	return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: handle,
			POST: handle,
		},
	},
});
