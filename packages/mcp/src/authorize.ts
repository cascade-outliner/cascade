import { auth } from "@cascade/auth";
import { createAuthorizationCode, getClient } from "./oauth.ts";
import { renderConsentPage, renderLoginPage } from "./pages.ts";

const AUTHORIZE_PARAMS = [
	"response_type",
	"client_id",
	"redirect_uri",
	"code_challenge",
	"code_challenge_method",
	"state",
	"scope",
] as const;

type Validation =
	| {
			ok: true;
			client: { id: string; clientName: string | null };
			redirectUri: string;
			codeChallenge: string;
	  }
	| { ok: false; error: string; redirectUri: string | null };

async function validateRequest(params: URLSearchParams): Promise<Validation> {
	const responseType = params.get("response_type");
	const clientId = params.get("client_id");
	const redirectUri = params.get("redirect_uri");
	const codeChallenge = params.get("code_challenge");
	const codeChallengeMethod = params.get("code_challenge_method");

	if (!clientId) {
		return {
			ok: false,
			error: "invalid_request: client_id is required",
			redirectUri: null,
		};
	}

	const client = await getClient(clientId);
	if (!client || !redirectUri || !client.redirectUris.includes(redirectUri)) {
		return {
			ok: false,
			error: "invalid_request: unknown client_id or redirect_uri",
			redirectUri: null,
		};
	}

	if (responseType !== "code") {
		return { ok: false, error: "unsupported_response_type", redirectUri };
	}

	if (codeChallengeMethod !== "S256" || !codeChallenge) {
		return {
			ok: false,
			error: "invalid_request: code_challenge (S256) is required",
			redirectUri,
		};
	}

	return { ok: true, client, redirectUri, codeChallenge };
}

export async function handleAuthorizeGet(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const validation = await validateRequest(url.searchParams);

	if (!validation.ok) {
		if (!validation.redirectUri) {
			return new Response(validation.error, { status: 400 });
		}
		const redirect = new URL(validation.redirectUri);
		redirect.searchParams.set("error", validation.error);
		const state = url.searchParams.get("state");
		if (state) redirect.searchParams.set("state", state);
		return Response.redirect(redirect, 302);
	}

	const session = await auth.api.getSession({ headers: request.headers });

	if (!session) {
		return new Response(renderLoginPage({ authorizeUrl: request.url }), {
			headers: { "content-type": "text/html" },
		});
	}

	const hiddenFields: Record<string, string> = {};
	for (const key of AUTHORIZE_PARAMS) {
		const value = url.searchParams.get(key);
		if (value) hiddenFields[key] = value;
	}

	return new Response(
		renderConsentPage({
			clientName: validation.client.clientName ?? "An MCP client",
			hiddenFields,
		}),
		{ headers: { "content-type": "text/html" } },
	);
}

export async function handleAuthorizePost(request: Request): Promise<Response> {
	const form = await request.formData();
	const params = new URLSearchParams();
	for (const key of AUTHORIZE_PARAMS) {
		const value = form.get(key);
		if (typeof value === "string") params.set(key, value);
	}

	const validation = await validateRequest(params);
	if (!validation.ok) {
		return new Response(validation.error, { status: 400 });
	}

	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return new Response("unauthorized", { status: 401 });
	}

	const redirect = new URL(validation.redirectUri);
	const state = params.get("state");

	if (form.get("action") !== "approve") {
		redirect.searchParams.set("error", "access_denied");
		if (state) redirect.searchParams.set("state", state);
		return Response.redirect(redirect, 302);
	}

	const code = await createAuthorizationCode({
		clientId: validation.client.id,
		userId: session.user.id,
		redirectUri: validation.redirectUri,
		codeChallenge: validation.codeChallenge,
	});

	redirect.searchParams.set("code", code);
	if (state) redirect.searchParams.set("state", state);
	return Response.redirect(redirect, 302);
}
