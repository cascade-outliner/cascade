import { expect, test } from "@playwright/test";

test("dark mode toggles via the user menu and survives reload", async ({
	page,
}) => {
	await page.goto("/");

	await page.getByRole("button", { name: "User menu" }).click();
	await page.getByRole("menuitem", { name: "Settings" }).click();
	await page.getByRole("switch", { name: "Dark mode" }).click();

	await expect(page.locator("html")).toHaveClass(/dark/);
	await expect
		.poll(() =>
			page.evaluate(() => JSON.parse(localStorage.settings ?? "{}").dark),
		)
		.toBe(true);

	await page.getByRole("button", { name: "Close settings" }).click();
	await page.reload();

	await expect(page.locator("html")).toHaveClass(/dark/);
});
