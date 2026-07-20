import { test } from "@playwright/test";
import { config } from "./support/config";
import { authFile } from "./support/env";

/**
 * Creates (if needed) and signs in as the shared perf-harness user via
 * better-auth's REST API, mirroring `e2e/auth.setup.ts`. The tree data itself
 * is expected to already be seeded by `e2e-perf/seed.ts` — this setup
 * only establishes the session.
 */
test("authenticate as the perf harness user", async ({ page }) => {
	const signUp = await page.request.post(`${config.appUrl}/api/auth/sign-up/email`, {
		headers: { origin: config.appUrl },
		data: {
			email: config.perfUserEmail,
			password: config.perfUserPassword,
			name: config.perfUserName,
		},
	});
	if (!signUp.ok()) {
		const body = await signUp.json().catch(() => ({}));
		const alreadyExists =
			typeof body.code === "string" && body.code.includes("USER_ALREADY_EXISTS");
		if (!alreadyExists) {
			throw new Error(
				`Failed to create perf user (${signUp.status()}): ${JSON.stringify(body)}`,
			);
		}
	}

	const signIn = await page.request.post(`${config.appUrl}/api/auth/sign-in/email`, {
		headers: { origin: config.appUrl },
		data: {
			email: config.perfUserEmail,
			password: config.perfUserPassword,
		},
	});
	if (!signIn.ok()) {
		const body = await signIn.json().catch(() => ({}));
		throw new Error(
			`Failed to sign in as perf user (${signIn.status()}): ${JSON.stringify(body)}`,
		);
	}

	await page.context().storageState({ path: authFile });
});
