import { createRateLimiter, getClientIp } from "@cascade/http/rate-limit";
import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";
import { createContext } from "@/orpc/context";
import router from "@/orpc/router";

const handler = new OpenAPIHandler(router, {
	interceptors: [
		onError((error) =>
			logger.error("openapi handler error", {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			}),
		),
	],
	plugins: [
		new SmartCoercionPlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
});

// Tighter than the RPC handler: this surface is meant for external API
// consumers rather than the app's own interactive UI.
const isRateLimited = createRateLimiter({ windowMs: 10_000, max: 100 });

async function handle({ request }: { request: Request }) {
	if (isRateLimited(getClientIp(request))) {
		return new Response("Too Many Requests", { status: 429 });
	}

	const { response } = await handler.handle(request, {
		prefix: "/api",
		context: await createContext(request),
	});

	return response ?? new Response("Not Found", { status: 404 });
}

export const Route = createFileRoute("/api/$")({
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
