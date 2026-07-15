import { createFileRoute } from "@tanstack/react-router";
// Loads TanStack Start's route type augmentation for `server.handlers`.
import type {} from "@tanstack/react-start";
import { auth } from "#/auth";

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
