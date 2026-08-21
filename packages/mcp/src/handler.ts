import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { verifyAccessToken } from "./oauth.ts";
import { createNodesServer } from "./server.ts";

function unauthorized(resourceMetadataUrl: string): Response {
	return new Response(JSON.stringify({ error: "unauthorized" }), {
		status: 401,
		headers: {
			"content-type": "application/json",
			"www-authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
		},
	});
}

export async function handleMcpRequest(
	request: Request,
	resourceMetadataUrl: string,
): Promise<Response> {
	const token = request.headers
		.get("authorization")
		?.match(/^Bearer\s+(.+)$/i)?.[1];

	if (!token) {
		return unauthorized(resourceMetadataUrl);
	}

	const verified = await verifyAccessToken(token);
	if (!verified) {
		return unauthorized(resourceMetadataUrl);
	}

	const server = createNodesServer(verified.userId);
	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
	});
	await server.connect(transport);

	return transport.handleRequest(request, {
		authInfo: {
			token,
			clientId: verified.clientId,
			scopes: [],
			extra: { userId: verified.userId },
		},
	});
}
