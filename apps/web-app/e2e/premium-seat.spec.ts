import { expect, test } from "./support/fixtures";

test("requesting and removing a premium seat in Settings updates status immediately and persists across reloads", async ({
	page,
	orpcClient,
}) => {
	const before = await orpcClient.premium.get();

	try {
		await page.goto("/");
		await page.getByRole("button", { name: "User menu" }).click();
		await page.getByRole("menuitem", { name: "Settings" }).click();
		await page.getByRole("tab", { name: "Premium" }).click();

		if (!before.isPremium) {
			await page.getByRole("button", { name: "Request premium seat" }).click();
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

		await page.getByRole("button", { name: "Remove premium seat" }).click();
		await expect(page.getByText("Premium seat active")).not.toBeVisible();
		await expect(
			page.getByRole("button", { name: "Request premium seat" }),
		).toBeVisible();
		await expect
			.poll(async () => (await orpcClient.premium.get()).isPremium)
			.toBe(false);
	} finally {
		// Restore whatever state the shared e2e account had before this test.
		if (before.isPremium) {
			await orpcClient.premium.requestSeat();
		} else {
			await orpcClient.premium.revokeSeat();
		}
	}
});
