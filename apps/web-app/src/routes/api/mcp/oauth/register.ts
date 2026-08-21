import { handleRegisterRequest } from "@cascade/mcp";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mcp/oauth/register")({
	server: {
		handlers: {
			POST: ({ request }) => handleRegisterRequest(request),
		},
	},
});
