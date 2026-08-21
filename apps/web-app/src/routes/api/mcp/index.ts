import { handleMcpRequest } from "@cascade/mcp";
import { createFileRoute } from "@tanstack/react-router";

async function handle({ request }: { request: Request }) {
	const resourceMetadataUrl = `${new URL(request.url).origin}/.well-known/oauth-protected-resource`;
	return handleMcpRequest(request, resourceMetadataUrl);
}

export const Route = createFileRoute("/api/mcp/")({
	server: {
		handlers: {
			GET: handle,
			POST: handle,
			DELETE: handle,
		},
	},
});
