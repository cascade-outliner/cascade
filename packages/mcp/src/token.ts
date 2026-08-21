import {
	exchangeAuthorizationCode,
	OAuthError,
	refreshAccessToken,
} from "./oauth.ts";

function errorResponse(code: string, message: string, status = 400) {
	return new Response(
		JSON.stringify({ error: code, error_description: message }),
		{
			status,
			headers: { "content-type": "application/json" },
		},
	);
}

export async function handleTokenRequest(request: Request): Promise<Response> {
	const form = await request.formData();
	const grantType = form.get("grant_type");
	const clientId = form.get("client_id");

	if (typeof clientId !== "string") {
		return errorResponse("invalid_request", "client_id is required");
	}

	try {
		if (grantType === "authorization_code") {
			const code = form.get("code");
			const redirectUri = form.get("redirect_uri");
			const codeVerifier = form.get("code_verifier");
			if (
				typeof code !== "string" ||
				typeof redirectUri !== "string" ||
				typeof codeVerifier !== "string"
			) {
				return errorResponse(
					"invalid_request",
					"code, redirect_uri, and code_verifier are required",
				);
			}

			const tokens = await exchangeAuthorizationCode({
				clientId,
				code,
				redirectUri,
				codeVerifier,
			});
			return Response.json(tokens);
		}

		if (grantType === "refresh_token") {
			const refreshToken = form.get("refresh_token");
			if (typeof refreshToken !== "string") {
				return errorResponse("invalid_request", "refresh_token is required");
			}

			const tokens = await refreshAccessToken({ clientId, refreshToken });
			return Response.json(tokens);
		}

		return errorResponse(
			"unsupported_grant_type",
			`${String(grantType)} is not supported`,
		);
	} catch (error) {
		if (error instanceof OAuthError) {
			return errorResponse(error.code, error.message, error.status);
		}
		throw error;
	}
}
