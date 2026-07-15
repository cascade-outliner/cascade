import { createRateLimiter, getClientIp } from "@cascade/http/rate-limit";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";
import { createContext } from "@/orpc/context";
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

// Generous window: normal interactive use (fast typing, drag-reordering)
// legitimately fires many small RPC calls per minute.
const isRateLimited = createRateLimiter({ windowMs: 10_000, max: 300 });

async function handle({ request }: { request: Request }) {
	if (isRateLimited(getClientIp(request))) {
		return new Response("Too Many Requests", { status: 429 });
	}

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
