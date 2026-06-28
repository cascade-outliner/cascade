import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/auth";
import router from "#/orpc/router";

const handler = new RPCHandler(router);

async function handle({ request }: { request: Request }) {
	const session = await auth.api.getSession({ headers: request.headers });
	const { response } = await handler.handle(request, {
		prefix: "/api/rpc",
		context: { session },
	});

	return response ?? new Response("Not Found", { status: 404 });
}

export const Route = createFileRoute("/api/rpc/$")({
	server: {
		handlers: {
			HEAD: handle,
			GET: handle,
			POST: handle,
			PUT: handle,
			PATCH: handle,
			DELETE: handle,
		},
	},
});
