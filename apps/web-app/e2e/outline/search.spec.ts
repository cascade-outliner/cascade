import { expect, test } from "../fixtures.ts";

test.describe("header search", () => {
	test.beforeEach(async ({ outlinePage }) => {
		await outlinePage.goto();
	});

	test("opens the command palette, ready to type", async ({
		appHeader,
		commandPalette,
	}) => {
		await appHeader.searchButton.click();

		await expect(commandPalette.dialog).toBeVisible();
		await expect(commandPalette.input).toBeFocused();
		await expect(commandPalette.input).toHaveValue("");
	});

	test("starts from an empty query each time", async ({
		appHeader,
		commandPalette,
		page,
	}) => {
		await appHeader.searchButton.click();
		await commandPalette.input.fill("groceries");
		await page.keyboard.press("Escape");
		await expect(commandPalette.dialog).toBeHidden();

		await appHeader.searchButton.click();

		await expect(commandPalette.input).toHaveValue("");
	});

	test("picking a result zooms into that node", async ({
		appHeader,
		commandPalette,
		outlinePage,
		page,
	}) => {
		await outlinePage.addNode("Plan the trip");

		await appHeader.searchButton.click();
		await commandPalette.input.fill("trip");
		await commandPalette.option("Plan the trip").click();

		await expect(commandPalette.dialog).toBeHidden();
		await expect(page).toHaveURL(/\/node\/[^/]+$/);
		await expect(outlinePage.title).toHaveText("Plan the trip");
	});

	test.describe("on a phone", () => {
		test.use({ viewport: { width: 375, height: 667 } });

		test("the icon-only button still opens the palette", async ({
			appHeader,
			commandPalette,
		}) => {
			await expect(appHeader.searchButton).toHaveAccessibleName("Search");
			await appHeader.searchButton.click();

			await expect(commandPalette.input).toBeFocused();
		});
	});
});
