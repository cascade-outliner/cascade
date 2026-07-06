import { expect, test } from "@playwright/test";

test("home route loads and renders the node tree", async ({ page }) => {
	await page.goto("/");

	await expect(
		page.getByRole("button", { name: "Add node" }),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Open node" }).first(),
	).toBeVisible();
});
