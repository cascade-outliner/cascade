import { expect, test } from "@playwright/test";

test("editing a node's content persists across reload", async ({ page }) => {
	await page.goto("/");

	await page.getByRole("link", { name: "Open node" }).first().click();
	await page.waitForURL(/\/node\/[0-9a-f-]{36}/);

	// Adding a node drops it straight into edit mode.
	await page.getByRole("button", { name: "Add node" }).click();

	const editable = page.locator('[contenteditable="true"]');
	await expect(editable).toBeVisible();

	const content = `e2e note ${Date.now()}`;
	await editable.pressSequentially(content);
	await editable.blur();

	const savedRow = page.getByRole("button", { name: "Edit node text" }).filter({
		hasText: content,
	});
	await expect(savedRow).toBeVisible();

	await page.reload();
	await expect(
		page
			.getByRole("button", { name: "Edit node text" })
			.filter({ hasText: content }),
	).toBeVisible();
});
