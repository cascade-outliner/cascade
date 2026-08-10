import { createRemoteJWKSet, jwtVerify } from "jose";

export const CASCADE_API_AUDIENCE = "cascade-api";

export interface AuthenticatedUser {
	id: string;
	email: string;
}

export interface JwtValidationConfig {
	jwksUrl: string;
	issuer: string;
	audience: string;
}

const remoteJwkSets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getRemoteJwkSet(jwksUrl: string) {
	let remoteJwkSet = remoteJwkSets.get(jwksUrl);
	if (!remoteJwkSet) {
		remoteJwkSet = createRemoteJWKSet(new URL(jwksUrl));
		remoteJwkSets.set(jwksUrl, remoteJwkSet);
	}
	return remoteJwkSet;
}

export async function validateJwtToken(
	token: string,
	config: JwtValidationConfig,
): Promise<AuthenticatedUser> {
	const { payload } = await jwtVerify(token, getRemoteJwkSet(config.jwksUrl), {
		issuer: config.issuer,
		audience: config.audience,
	});

	if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
		throw new Error("JWT is missing required subject or email claims");
	}

	return {
		id: payload.sub,
		email: payload.email,
	};
}
