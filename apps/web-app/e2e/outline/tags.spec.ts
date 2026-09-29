import { expect, test } from "../fixtures.ts";

test.describe("tags", () => {
	test.beforeEach(async ({ outlinePage }) => {
		await outlinePage.goto();
		await outlinePage.addNode("Ship it #work");
	});

	test("renders #tag as a chip", async ({ outlinePage }) => {
		await expect(outlinePage.tag("work")).toBeVisible();
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
