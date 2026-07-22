import { expect, test } from "./support/fixtures";

// Premium seats have no revoke path yet (see #404), so granting one on the
// shared e2e account is a one-way change — unlike the sibling settings spec,
// there's no `finally` block restoring prior state here. That's fine: the
// grant is idempotent and harmless, and it means future premium-gated e2e
// tests can rely on this account already having a seat.
test("requesting a premium seat in Settings grants it immediately and it persists across reloads", async ({
	page,
	orpcClient,
}) => {
	await page.goto("/");
	await page.getByRole("button", { name: "User menu" }).click();
	await page.getByRole("menuitem", { name: "Settings" }).click();
	await page.getByRole("tab", { name: "Premium" }).click();

	const requestButton = page.getByRole("button", {
		name: "Request premium seat",
	});
	// Idempotent: a prior run may have already granted this shared account a
	// seat, in which case the request button no longer renders at all.
	if (await requestButton.isVisible()) {
		await requestButton.click();
	}

	await expect(page.getByText("Premium seat active")).toBeVisible();
	await expect
		.poll(async () => (await orpcClient.premium.get()).isPremium)
		.toBe(true);

	await page.getByRole("button", { name: "Close settings" }).click();

	// A reload gets the same status from the account, not just local cache.
	await page.reload();
	await page.getByRole("button", { name: "User menu" }).click();
	await page.getByRole("menuitem", { name: "Settings" }).click();
	await page.getByRole("tab", { name: "Premium" }).click();
	await expect(page.getByText("Premium seat active")).toBeVisible();
});
