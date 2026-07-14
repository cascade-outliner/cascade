import { test } from "@playwright/test";
import { ensureTestUser, signInTestUser } from "./support/auth";
import { authFile } from "./support/env";

test("authenticate as the e2e test user", async ({ page }) => {
	await ensureTestUser(page.request);
	await signInTestUser(page.request);
	await page.context().storageState({ path: authFile });
});
