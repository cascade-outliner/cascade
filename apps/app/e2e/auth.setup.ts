import { test } from "@playwright/test";
import { ensureTestUser, signInTestUser } from "./support/auth";
import { authFile } from "./support/env";
import { createOrpcClient } from "./support/orpc-client";

test("authenticate as the e2e test user", async ({ page }) => {
	await ensureTestUser(page.request);
	await signInTestUser(page.request);

	// Premium-gated features (e.g. non-Cascade themes) need the shared e2e
	// account to hold a seat; granting it once here (idempotent) means specs
	// don't each have to do it themselves.
	await createOrpcClient(page.context()).premium.requestSeat();

	await page.context().storageState({ path: authFile });
});
