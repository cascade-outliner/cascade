import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "#/server/auth.ts";

function handle({ request }: { request: Request }): Promise<Response> {
	const auth = getAuth();
	if (!auth) {
		return Promise.resolve(
			new Response("Sign-in is not configured", { status: 404 }),
		);
	}
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
