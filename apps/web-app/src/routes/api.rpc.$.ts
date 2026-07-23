import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { createContext } from "@/orpc/context";
import { logger } from "@/orpc/request-logger";
import router from "@/orpc/router";

const handler = new RPCHandler(router, {
	interceptors: [
		onError((error) =>
			logger.error("rpc handler error", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			}),
		),
	],
});

async function handle({ request }: { request: Request }) {
	const { response } = await handler.handle(request, {
		prefix: "/api/rpc",
		context: await createContext(request),
	});

	return response ?? new Response("Not Found", { status: 404 });
}

export const Route = createFileRoute("/api/rpc/$")({
	server: {
		handlers: {
			// Mutations must not be reachable over GET; the RPC protocol only needs POST.
			POST: handle,
		},
	},
});
