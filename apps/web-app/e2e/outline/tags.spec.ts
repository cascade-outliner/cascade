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

	test("clicking a chip opens that tag's nodes; picking one zooms in", async ({
		outlinePage,
		page,
	}) => {
		await outlinePage.tag("work").click();

		await expect(page).toHaveURL(/\/tag\/work$/);
		await expect(page.getByTestId("tag-title")).toHaveText("#work");
		await page.getByTestId("tag-result").filter({ hasText: "Ship it" }).click();

		await expect(page).toHaveURL(/\/node\/[^/]+$/);
		await expect(outlinePage.title).toHaveText("Ship it #work");
	});
});
