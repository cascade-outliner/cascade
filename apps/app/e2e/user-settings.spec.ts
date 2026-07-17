import { expect, test } from "./support/fixtures";

test("dark mode persists to the account and applies on a device with no local state", async ({
	page,
	orpcClient,
}) => {
	const before = await orpcClient.settings.get();
	const wasDark = before.dark ?? false;

	try {
		await page.goto("/");
		await page.getByRole("button", { name: "User menu" }).click();
		await page.getByRole("menuitem", { name: "Settings" }).click();
		await page.getByRole("switch", { name: "Dark mode" }).click();
		// Closing the dialog is what saves the changes to the account.
		await page.getByRole("button", { name: "Close settings" }).click();

		// The change lands server-side, not just in this tab.
		await expect
			.poll(async () => (await orpcClient.settings.get()).dark)
			.toBe(!wasDark);

		// A device with no local cache gets the setting from the account.
		await page.evaluate(() => localStorage.removeItem("settings"));
		await page.reload();
		await expect
			.poll(() =>
				page.evaluate(() =>
					document.documentElement.classList.contains("dark"),
				),
			)
			.toBe(!wasDark);
	} finally {
		// Settings are user-wide state on the shared e2e user; put it back.
		await orpcClient.settings.update({ dark: wasDark });
	}
});
