import { expect, test } from "../fixtures.ts";

// Day notes follow the browser's local date; pin both the instant and the zone.
test.use({ timezoneId: "UTC" });

test.describe("daily nodes", () => {
	test.beforeEach(async ({ outlinePage, page }) => {
		await page.clock.setFixedTime("2026-09-27T10:00:00Z");
		await outlinePage.goto();
	});

	test("Today opens today's note", async ({
		daySwitcher,
		outlinePage,
		page,
	}) => {
		await daySwitcher.openToday();

		await expect(page).toHaveURL(/\/node\/daily-2026-09-27$/);
		await expect(outlinePage.title).toHaveText("Today");
		await expect(daySwitcher.dayButton("Today")).toHaveAttribute(
			"aria-current",
			"page",
		);
	});

	test("lines added to today's note survive a reload", async ({
		daySwitcher,
		outlinePage,
		page,
	}) => {
		await daySwitcher.openToday();
		// Home lists today's note as a row too; wait for the day page before typing.
		await expect(outlinePage.title).toHaveText("Today");

		await outlinePage.addNode("Call the landlord");
		await expect
			.poll(() => outlinePage.isSaved("Call the landlord"))
			.toBe(true);
		await page.reload();

		await expect(outlinePage.title).toHaveText("Today");
		await expect(outlinePage.rows).toHaveText(["Call the landlord"]);
	});

	test("⌘K Today's note reuses the existing note", async ({
		daySwitcher,
		outlinePage,
		page,
	}) => {
		await daySwitcher.openToday();
		await expect(outlinePage.title).toHaveText("Today");
		await outlinePage.goto("/");

		await page.keyboard.press("ControlOrMeta+k");
		await page.getByRole("option", { name: "Today's note" }).click();

		await expect(page).toHaveURL(/\/node\/daily-2026-09-27$/);
		await outlinePage.goto("/node/daily");
		await expect(outlinePage.rows).toHaveText(["2026", "September", "Today"]);
	});

	test("the arrows step a day at a time, creating notes as needed", async ({
		daySwitcher,
		outlinePage,
		page,
	}) => {
		await daySwitcher.previousButton.click();
		await expect(page).toHaveURL(/\/node\/daily-2026-09-26$/);
		await expect(outlinePage.title).toHaveText("Yesterday");
		await expect(daySwitcher.dayButton("Yesterday")).toBeVisible();

		await daySwitcher.nextButton.click();
		await daySwitcher.nextButton.click();
		await expect(page).toHaveURL(/\/node\/daily-2026-09-28$/);
		await expect(outlinePage.title).toHaveText("Tomorrow");

		await daySwitcher.nextButton.click();
		await expect(page).toHaveURL(/\/node\/daily-2026-09-29$/);
		await expect(outlinePage.title).toHaveText("Tuesday, 29th");
		await expect(daySwitcher.dayButton("Sep 29")).toBeVisible();

		await outlinePage.goto("/node/daily-2026-09");
		await expect(outlinePage.rows).toHaveText([
			"Yesterday",
			"Today",
			"Tomorrow",
			"Tuesday, 29th",
		]);
	});

	test("day titles can't be edited", async ({ daySwitcher, outlinePage }) => {
		// "Today" is a plain label; further-out days are a read-only editor.
		await daySwitcher.openToday();
		await expect(outlinePage.title).toHaveText("Today");
		await expect(outlinePage.title.getByRole("textbox")).toHaveCount(0);

		await daySwitcher.nextButton.click();
		await daySwitcher.nextButton.click();
		await expect(outlinePage.title).toHaveText("Tuesday, 29th");
		await expect(outlinePage.title.getByRole("textbox")).not.toBeEditable();
	});

	test("nodes can be added directly under Daily nodes", async ({
		daySwitcher,
		outlinePage,
	}) => {
		await daySwitcher.openToday();
		await expect(outlinePage.title).toHaveText("Today");

		await outlinePage.goto("/node/daily");
		await outlinePage.addNode("Loose thought");

		await expect(outlinePage.rows).toHaveText([
			"2026",
			"September",
			"Today",
			"Loose thought",
		]);
	});
});
