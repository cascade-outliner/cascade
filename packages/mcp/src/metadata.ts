export function protectedResourceMetadata(origin: string) {
	return {
		resource: `${origin}/api/mcp`,
		authorization_servers: [origin],
	};
}

export function authorizationServerMetadata(origin: string) {
	return {
		issuer: origin,
		authorization_endpoint: `${origin}/api/mcp/oauth/authorize`,
		token_endpoint: `${origin}/api/mcp/oauth/token`,
		registration_endpoint: `${origin}/api/mcp/oauth/register`,
		response_types_supported: ["code"],
		grant_types_supported: ["authorization_code", "refresh_token"],
		code_challenge_methods_supported: ["S256"],
		token_endpoint_auth_methods_supported: ["none"],
	};
}
