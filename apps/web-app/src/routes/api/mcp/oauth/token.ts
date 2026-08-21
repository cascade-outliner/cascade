import { handleTokenRequest } from "@cascade/mcp";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mcp/oauth/token")({
	server: {
		handlers: {
			POST: ({ request }) => handleTokenRequest(request),
		},
	},
});
