import { auth } from "@cascade/auth/server";
import { createFileRoute } from "@tanstack/react-router";

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
