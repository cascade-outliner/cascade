import { expect, test } from "@playwright/test";

test("Cmd+K opens search, finds a node, and navigates to it", async ({
	page,
}) => {
	await page.goto("/");

	const unique = Math.random().toString(36).slice(2, 10);
	const content = `zzzsearchable elasticsearch alternative ${unique}`;
	await page.getByRole("button", { name: "Add node" }).click();
	const editable = page.locator('[contenteditable="true"]');
	await expect(editable).toBeVisible();
	await editable.pressSequentially(content);
	await editable.blur();
	await expect(
		page.getByRole("button", { name: "Edit node text" }).filter({
			hasText: content,
		}),
	).toBeVisible();

	await page.keyboard.down("Control");
	await page.keyboard.press("k");
	await page.keyboard.up("Control");

	const input = page.getByPlaceholder("Search nodes…");
	await expect(input).toBeVisible();
	await input.pressSequentially("zzzsearchable");

	const option = page.getByRole("option").filter({ hasText: content });
	await expect(option).toBeVisible();
	await expect(option.locator("mark").first()).toBeVisible();

	await page.keyboard.press("Enter");
	await page.waitForURL(/\/node\/[0-9a-f-]{36}/);
	await expect(page.getByRole("dialog", { name: "Search" })).not.toBeVisible();
	await expect(page.getByText(content).first()).toBeVisible();
});

test("Escape closes the palette without navigating", async ({ page }) => {
	await page.goto("/");

	await page.keyboard.down("Control");
	await page.keyboard.press("k");
	await page.keyboard.up("Control");

	const input = page.getByPlaceholder("Search nodes…");
	await expect(input).toBeVisible();

	await page.keyboard.press("Escape");
	await expect(input).not.toBeVisible();
	expect(page.url()).toMatch(/\/$/);
});
