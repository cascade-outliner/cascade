import type { Locator } from "@playwright/test";
import { expect, test } from "../fixtures.ts";

const TEXT = "Call the landlord and pay the rent";

async function position(locator: Locator) {
	const box = await locator.boundingBox();
	if (!box) throw new Error("Expected the element to be on screen");
	return { x: box.x, y: box.y, width: box.width, height: box.height };
}

test.describe("the + button", () => {
	test.beforeEach(async ({ outlinePage }) => {
		await outlinePage.goto();
	});

	test("opens the commands without typing a slash", async ({
		outlinePage,
		slashMenu,
	}) => {
		await outlinePage.captureInput.fill("Buy milk");
		await outlinePage.captureMenuButton.click();

		await expect(slashMenu.menu).toBeVisible();
		await expect(slashMenu.option("Due today")).toBeVisible();
		await expect(outlinePage.captureInput).toHaveText("Buy milk");
	});

	test("picking a command adds its chip and returns to the input", async ({
		outlinePage,
		slashMenu,
	}) => {
		await outlinePage.captureInput.fill("Buy milk");
		await outlinePage.captureMenuButton.click();
		await slashMenu.option("Due today").click();

		await expect(slashMenu.menu).toBeHidden();
		await expect(outlinePage.captureChips).toHaveText(["Due today"]);
		await expect(outlinePage.captureInput).toHaveText("Buy milk");
		await expect(outlinePage.captureInput).toBeFocused();

		await outlinePage.captureInput.press("Enter");

		await expect(outlinePage.duePill("Buy milk")).toHaveText("Today");
	});

	test("Escape and an outside click close it", async ({
		outlinePage,
		slashMenu,
	}) => {
		await outlinePage.captureMenuButton.click();
		await expect(slashMenu.menu).toBeVisible();
		await outlinePage.captureInput.press("Escape");
		await expect(slashMenu.menu).toBeHidden();

		await outlinePage.captureMenuButton.click();
		await expect(slashMenu.menu).toBeVisible();
		await outlinePage.title.or(outlinePage.emptyState).first().click();
		await expect(slashMenu.menu).toBeHidden();
		await expect(outlinePage.captureChips).toHaveCount(0);
	});

	test("the buttons stay put while typing and picking commands", async ({
		outlinePage,
		slashMenu,
	}) => {
		const buttons = [outlinePage.captureMenuButton, outlinePage.addButton];
		const before = await Promise.all(buttons.map(position));

		await outlinePage.captureInput.fill(TEXT);
		await outlinePage.captureMenuButton.click();
		await slashMenu.option("Turn into task").click();
		await outlinePage.captureMenuButton.click();
		await slashMenu.option("Due tomorrow").click();
		await expect(outlinePage.captureChips).toHaveCount(2);

		for (const [index, button] of buttons.entries()) {
			await expect.poll(() => position(button)).toEqual(before[index]);
		}
	});
});

test.describe("split button", () => {
	test.beforeEach(async ({ outlinePage, splitApi }) => {
		await splitApi.enable();
		await outlinePage.goto();
	});

	test("takes its space before there is text, so nothing moves", async ({
		outlinePage,
	}) => {
		const before = await position(outlinePage.addButton);

		await expect(outlinePage.captureSplitButton).toBeDisabled();
		await outlinePage.captureInput.fill(TEXT);

		await expect(outlinePage.captureSplitButton).toBeEnabled();
		await expect.poll(() => position(outlinePage.addButton)).toEqual(before);
	});

	test("is labelled on a wide screen", async ({ outlinePage }) => {
		await outlinePage.captureInput.fill(TEXT);

		await expect(
			outlinePage.captureSplitButton.getByText("Split", { exact: true }),
		).toBeVisible();
	});
});

test.describe("on a phone", () => {
	test.use({
		viewport: { width: 390, height: 780 },
		hasTouch: true,
		isMobile: true,
	});

	test.beforeEach(async ({ outlinePage, splitApi }) => {
		await splitApi.enable();
		await outlinePage.goto();
	});

	test("the split button is just an icon", async ({ outlinePage }) => {
		await outlinePage.captureInput.fill(TEXT);

		await expect(outlinePage.captureSplitButton).toBeEnabled();
		await expect(
			outlinePage.captureSplitButton.getByText("Split", { exact: true }),
		).toBeHidden();
	});

	test("chips get their own line and the buttons stay put", async ({
		outlinePage,
		slashMenu,
	}) => {
		await outlinePage.captureInput.fill(TEXT);
		const before = await position(outlinePage.captureMenuButton);

		await outlinePage.captureMenuButton.tap();
		await slashMenu.option("Due today").tap();

		await expect(outlinePage.captureChips).toHaveText(["Due today"]);
		const chip = await position(outlinePage.captureChips.first());
		expect(chip.y).toBeLessThan(before.y);
		await expect
			.poll(() => position(outlinePage.captureMenuButton))
			.toEqual(before);
	});
});
