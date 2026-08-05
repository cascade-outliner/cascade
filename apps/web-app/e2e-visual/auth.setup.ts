import { test } from "@playwright/test";
import { authFile, env } from "./support/env";
import { createOrpcClient } from "./support/orpc-client";

/**
 * Creates (if needed) and signs in as the shared visual-harness user,
 * mirroring e2e/auth.setup.ts and e2e-perf/auth.setup.ts. Requesting a
 * premium seat here (idempotent) means specs can screenshot premium-only
 * themes (e.g. Nord) without each doing it themselves.
 */
test("authenticate as the visual harness user", async ({ page }) => {
	const signUp = await page.request.post(
		`${env.appUrl}/api/auth/sign-up/email`,
		{
			headers: { origin: env.appUrl },
			data: {
				email: env.testUserEmail,
				password: env.testUserPassword,
				name: env.testUserName,
			},
		},
	);
	if (!signUp.ok()) {
		const body = await signUp.json().catch(() => ({}));
		const alreadyExists =
			typeof body.code === "string" &&
			body.code.includes("USER_ALREADY_EXISTS");
		if (!alreadyExists) {
			throw new Error(
				`Failed to create visual harness user (${signUp.status()}): ${JSON.stringify(body)}`,
			);
		}
	}

	const signIn = await page.request.post(
		`${env.appUrl}/api/auth/sign-in/email`,
		{
			headers: { origin: env.appUrl },
			data: {
				email: env.testUserEmail,
				password: env.testUserPassword,
			},
		},
	);
	if (!signIn.ok()) {
		const body = await signIn.json().catch(() => ({}));
		throw new Error(
			`Failed to sign in as visual harness user (${signIn.status()}): ${JSON.stringify(body)}`,
		);
	}

	await createOrpcClient(page.context()).premium.requestSeat();

	await page.context().storageState({ path: authFile });
});
