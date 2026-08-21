import { authorizationServerMetadata } from "@cascade/mcp";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/.well-known/oauth-authorization-server")(
	{
		server: {
			handlers: {
				GET: ({ request }) =>
					Response.json(
						authorizationServerMetadata(new URL(request.url).origin),
					),
			},
		},
	},
);
