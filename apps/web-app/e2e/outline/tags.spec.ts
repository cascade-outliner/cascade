import { expect, test } from "../fixtures.ts";

test.describe("tags", () => {
	test.beforeEach(async ({ outlinePage }) => {
		await outlinePage.goto();
		await outlinePage.addNode("Ship it #work");
	});

	test("renders #tag as its own inline node", async ({ page }) => {
		// A hashtag is a separate text span; plain text would be one span.
		await expect(
			page
				.getByTestId("outliner-content")
				.locator("span[data-lexical-text]", { hasText: /^#work$/ }),
		).toBeVisible();
	});

	test("the palette lists tags and picking one searches for it", async ({
		appHeader,
		commandPalette,
	}) => {
		await appHeader.searchButton.click();
		await commandPalette.input.fill("#wo");
		await commandPalette.option(/^#work/).click();

		await expect(commandPalette.input).toHaveValue("#work");
		await expect(commandPalette.option("Ship it #work")).toBeVisible();
	});
});
