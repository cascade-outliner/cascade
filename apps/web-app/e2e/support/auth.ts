import type { APIRequestContext } from "@playwright/test";
import { env } from "./env";

/**
 * Creates the shared e2e test user via better-auth's REST API
 */
export async function ensureTestUser(
	request: APIRequestContext,
): Promise<void> {
	const response = await request.post(`${env.appUrl}/api/auth/sign-up/email`, {
		headers: { origin: env.appUrl },
		data: {
			email: env.testUserEmail,
			password: env.testUserPassword,
			name: env.testUserName,
		},
	});
	if (response.ok()) return;

	const body = await response.json().catch(() => ({}));
	const alreadyExists =
		typeof body.code === "string" && body.code.includes("USER_ALREADY_EXISTS");

	if (!alreadyExists) {
		throw new Error(
			`Failed to create e2e test user (${response.status()}): ${JSON.stringify(body)}`,
		);
	}
}

/** Signs in as the e2e test user, leaving the session cookie on `request`'s context. */
export async function signInTestUser(
	request: APIRequestContext,
): Promise<void> {
	const response = await request.post(`${env.appUrl}/api/auth/sign-in/email`, {
		headers: { origin: env.appUrl },
		data: {
			email: env.testUserEmail,
			password: env.testUserPassword,
		},
	});
	if (!response.ok()) {
		const body = await response.json().catch(() => ({}));
		throw new Error(
			`Failed to sign in as e2e test user (${response.status()}): ${JSON.stringify(body)}`,
		);
	}
}
