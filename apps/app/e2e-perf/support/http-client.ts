import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type router from "@/orpc/router";
import { config } from "./config";

export type PerfOrpcClient = RouterClient<typeof router>;

async function ensurePerfUserExists(): Promise<void> {
	const response = await fetch(`${config.appUrl}/api/auth/sign-up/email`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: config.appUrl },
		body: JSON.stringify({
			email: config.perfUserEmail,
			password: config.perfUserPassword,
			name: config.perfUserName,
		}),
	});
	if (response.ok) return;

	const body = await response.json().catch(() => ({}));
	const alreadyExists =
		typeof body.code === "string" && body.code.includes("USER_ALREADY_EXISTS");
	if (!alreadyExists) {
		throw new Error(
			`Failed to create perf user (${response.status}): ${JSON.stringify(body)}`,
		);
	}
}

/** Signs in as the perf user via better-auth's REST API, returning a `cookie` header value. */
async function signInPerfUser(): Promise<string> {
	const response = await fetch(`${config.appUrl}/api/auth/sign-in/email`, {
		method: "POST",
		headers: { "content-type": "application/json", origin: config.appUrl },
		body: JSON.stringify({
			email: config.perfUserEmail,
			password: config.perfUserPassword,
		}),
	});
	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new Error(
			`Failed to sign in as perf user (${response.status}): ${JSON.stringify(body)}`,
		);
	}

	const setCookie = response.headers.getSetCookie();
	if (setCookie.length === 0) {
		throw new Error("Sign-in response had no Set-Cookie header");
	}
	return setCookie.map((cookie) => cookie.split(";")[0]).join("; ");
}

/**
 * Builds an oRPC client authenticated as the shared perf-harness user, the
 * same way `e2e/support/orpc-client.ts` does for e2e tests but over a plain
 * `fetch`-based sign-in instead of a browser context. Requires the app server
 * to already be running at `config.appUrl` (e.g. `pnpm dev:app` locally, or
 * the built server in CI).
 */
export async function createPerfClient(): Promise<PerfOrpcClient> {
	await ensurePerfUserExists();
	const cookie = await signInPerfUser();
	const link = new RPCLink({
		url: `${config.appUrl}/api/rpc`,
		headers: () => ({ cookie }),
	});
	return createORPCClient(link);
}
