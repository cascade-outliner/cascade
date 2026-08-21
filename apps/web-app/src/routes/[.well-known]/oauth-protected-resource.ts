import { protectedResourceMetadata } from "@cascade/mcp";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
	server: {
		handlers: {
			GET: ({ request }) =>
				Response.json(protectedResourceMetadata(new URL(request.url).origin)),
		},
	},
});
