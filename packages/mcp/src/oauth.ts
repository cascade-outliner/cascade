import { createHash, randomBytes } from "node:crypto";
import { db, mcpOAuthClient, mcpOAuthCode, mcpOAuthToken } from "@cascade/db";
import { eq, lt } from "drizzle-orm";

export class OAuthError extends Error {
	code: string;
	status: number;

	constructor(code: string, message: string, status = 400) {
		super(message);
		this.name = "OAuthError";
		this.code = code;
		this.status = status;
	}
}

const CODE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

function randomToken(bytes = 32) {
	return randomBytes(bytes).toString("base64url");
}

function sha256Base64Url(input: string) {
	return createHash("sha256").update(input).digest("base64url");
}

export async function registerClient(body: unknown) {
	const parsed = body as { client_name?: string; redirect_uris?: unknown };
	if (
		!Array.isArray(parsed.redirect_uris) ||
		parsed.redirect_uris.length === 0 ||
		!parsed.redirect_uris.every((uri) => typeof uri === "string")
	) {
		throw new OAuthError(
			"invalid_client_metadata",
			"redirect_uris must be a non-empty array of strings",
		);
	}

	const [client] = await db
		.insert(mcpOAuthClient)
		.values({
			id: randomToken(16),
			clientName:
				typeof parsed.client_name === "string" ? parsed.client_name : null,
			redirectUris: parsed.redirect_uris,
		})
		.returning();

	return {
		client_id: client.id,
		client_name: client.clientName ?? undefined,
		redirect_uris: client.redirectUris,
		token_endpoint_auth_method: "none",
		grant_types: ["authorization_code", "refresh_token"],
		response_types: ["code"],
	};
}

export async function getClient(clientId: string) {
	const [client] = await db
		.select()
		.from(mcpOAuthClient)
		.where(eq(mcpOAuthClient.id, clientId));
	return client ?? null;
}

export async function createAuthorizationCode(params: {
	clientId: string;
	userId: string;
	redirectUri: string;
	codeChallenge: string;
}) {
	const [row] = await db
		.insert(mcpOAuthCode)
		.values({
			code: randomToken(),
			clientId: params.clientId,
			userId: params.userId,
			redirectUri: params.redirectUri,
			codeChallenge: params.codeChallenge,
			expiresAt: new Date(Date.now() + CODE_TTL_MS),
		})
		.returning();
	return row.code;
}

async function issueTokens(clientId: string, userId: string) {
	await db.delete(mcpOAuthToken).where(lt(mcpOAuthToken.expiresAt, new Date()));

	const [row] = await db
		.insert(mcpOAuthToken)
		.values({
			accessToken: randomToken(),
			refreshToken: randomToken(),
			clientId,
			userId,
			expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
		})
		.returning();

	return {
		access_token: row.accessToken,
		token_type: "Bearer",
		expires_in: ACCESS_TOKEN_TTL_MS / 1000,
		refresh_token: row.refreshToken,
	};
}

export async function exchangeAuthorizationCode(params: {
	clientId: string;
	code: string;
	redirectUri: string;
	codeVerifier: string;
}) {
	const [row] = await db
		.select()
		.from(mcpOAuthCode)
		.where(eq(mcpOAuthCode.code, params.code));

	if (!row || row.usedAt || row.expiresAt < new Date()) {
		throw new OAuthError(
			"invalid_grant",
			"Authorization code is invalid or expired",
		);
	}

	if (
		row.clientId !== params.clientId ||
		row.redirectUri !== params.redirectUri
	) {
		throw new OAuthError(
			"invalid_grant",
			"Authorization code does not match client or redirect_uri",
		);
	}

	if (sha256Base64Url(params.codeVerifier) !== row.codeChallenge) {
		throw new OAuthError(
			"invalid_grant",
			"code_verifier does not match code_challenge",
		);
	}

	await db
		.update(mcpOAuthCode)
		.set({ usedAt: new Date() })
		.where(eq(mcpOAuthCode.code, params.code));

	return issueTokens(row.clientId, row.userId);
}

export async function refreshAccessToken(params: {
	clientId: string;
	refreshToken: string;
}) {
	const [row] = await db
		.select()
		.from(mcpOAuthToken)
		.where(eq(mcpOAuthToken.refreshToken, params.refreshToken));

	if (!row || row.clientId !== params.clientId) {
		throw new OAuthError("invalid_grant", "refresh_token is invalid");
	}

	await db
		.delete(mcpOAuthToken)
		.where(eq(mcpOAuthToken.accessToken, row.accessToken));

	return issueTokens(row.clientId, row.userId);
}

export async function verifyAccessToken(accessToken: string) {
	const [row] = await db
		.select()
		.from(mcpOAuthToken)
		.where(eq(mcpOAuthToken.accessToken, accessToken));

	if (!row || row.expiresAt < new Date()) {
		return null;
	}

	return { userId: row.userId, clientId: row.clientId };
}
