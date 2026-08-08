import { allNodeCapabilities } from "@cascade/outliner/node-capabilities";
import { test } from "@playwright/test";
import { ensureTestUser, signInTestUser } from "./support/auth";
import { authFile } from "./support/env";
import { createOrpcClient } from "./support/orpc-client";

test("authenticate as the e2e test user", async ({ page }) => {
	await ensureTestUser(page.request);
	await signInTestUser(page.request);

	const orpcClient = createOrpcClient(page.context());

	// Premium-gated features (e.g. non-Cascade themes) need the shared e2e
	// account to hold a seat; granting it once here (idempotent) means specs
	// don't each have to do it themselves.
	await orpcClient.premium.requestSeat();

	// New accounts get a first-run onboarding tour overlay that intercepts
	// pointer events across the app until dismissed. Marking it completed
	// once here (idempotent) keeps specs from having to dismiss it themselves.
	await orpcClient.settings.update({
		onboardingCompleted: true,
		enabledNodeCapabilities: [...allNodeCapabilities],
	});

	await page.context().storageState({ path: authFile });
});
