import { handleAuthorizeGet, handleAuthorizePost } from "@cascade/mcp";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mcp/oauth/authorize")({
	server: {
		handlers: {
			GET: ({ request }) => handleAuthorizeGet(request),
			POST: ({ request }) => handleAuthorizePost(request),
		},
	},
});
