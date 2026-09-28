import { expect, test } from "../fixtures.ts";

test.describe("adding a node", () => {
	test.beforeEach(async ({ outlinePage }) => {
		await outlinePage.goto();
	});

	test("Enter adds the node and keeps focus for the next one", async ({
		outlinePage,
	}) => {
		await expect(outlinePage.emptyState).toBeVisible();

		await outlinePage.addNode("Buy milk");

		await expect(outlinePage.row("Buy milk")).toBeVisible();
		await expect(outlinePage.emptyState).toBeHidden();
		await expect(outlinePage.captureInput).toHaveText("");
		await expect(outlinePage.captureInput).toBeFocused();
	});

	test("the Add button adds the node", async ({ outlinePage }) => {
		await outlinePage.captureInput.fill("Call mom");
		await outlinePage.addButton.click();

		await expect(outlinePage.row("Call mom")).toBeVisible();
	});

	test("new nodes append in order", async ({ outlinePage }) => {
		for (const text of ["First", "Second", "Third"]) {
			await outlinePage.addNode(text);
		}

		await expect(outlinePage.rows).toHaveText(["First", "Second", "Third"]);
	});

	test("trims whitespace and ignores blank input", async ({ outlinePage }) => {
		await outlinePage.captureInput.fill("   ");
		await expect(outlinePage.addButton).toBeDisabled();
		await outlinePage.captureInput.press("Enter");
		await expect(outlinePage.rows).toHaveCount(0);

		await outlinePage.addNode("  Padded  ");
		await expect(outlinePage.rows).toHaveText(["Padded"]);
	});

	test("the node survives a reload", async ({ outlinePage, page }) => {
		await outlinePage.addNode("Persist me");
		await expect(outlinePage.row("Persist me")).toBeVisible();
		await expect.poll(() => outlinePage.isSaved("Persist me")).toBe(true);

		await page.reload();

		await expect(outlinePage.row("Persist me")).toBeVisible();
	});
});
