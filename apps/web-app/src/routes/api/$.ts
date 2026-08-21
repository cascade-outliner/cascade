import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { router } from "#/orpc/router.ts";

const handler = new OpenAPIHandler(router);

async function handle({ request }: { request: Request }) {
	const { response } = await handler.handle(request, {
		prefix: "/api",
		context: {},
	});

	return response ?? new Response("Not Found", { status: 404 });
}

export const Route = createFileRoute("/api/$")({
	server: {
		handlers: {
			GET: handle,
			POST: handle,
			PUT: handle,
			PATCH: handle,
			DELETE: handle,
		},
	},
});
