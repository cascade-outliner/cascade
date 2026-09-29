import { expect, test } from "../fixtures.ts";

// Day notes follow the browser's local date; pin both the instant and the zone.
test.use({ timezoneId: "UTC" });

test.beforeEach(async ({ outlinePage, page }) => {
	await page.clock.setFixedTime("2026-09-27T10:00:00Z");
	await outlinePage.goto();
});

test.describe("daily nodes", () => {
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
		await outlinePage.addNode("Something");
		await outlinePage.goto("/");

		await page.keyboard.press("ControlOrMeta+k");
		await page.getByRole("option", { name: "Today's note" }).click();

		await expect(page).toHaveURL(/\/node\/daily-2026-09-27$/);
		await outlinePage.goto("/node/daily");
		await expect(outlinePage.rows).toHaveText([
			"2026",
			"September",
			"Today",
			"Something",
		]);
	});

	test("the arrows step a day at a time, without creating notes", async ({
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

		// Only a node added under a date creates it.
		await outlinePage.addNode("Plan");
		await outlinePage.goto("/node/daily-2026-09");
		await expect(outlinePage.rows).toHaveText(["Tuesday, 29th", "Plan"]);
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
		await outlinePage.addNode("Day thought");

		await outlinePage.goto("/node/daily");
		await outlinePage.addNode("Loose thought");

		await expect(outlinePage.rows).toHaveText([
			"2026",
			"September",
			"Today",
			"Day thought",
			"Loose thought",
		]);
	});
});

test.describe("due dates", () => {
	test("quick picks set the pill, and Remove clears it", async ({
		dueDateMenu,
		outlinePage,
	}) => {
		await outlinePage.addNode("Call the landlord");

		await dueDateMenu.open(outlinePage.row("Call the landlord"));
		await dueDateMenu.item("Tomorrow").click();
		await expect(outlinePage.duePill("Call the landlord")).toHaveText(
			"Tomorrow",
		);

		await dueDateMenu.open(outlinePage.row("Call the landlord"));
		await dueDateMenu.item("Remove due date").click();
		await expect(outlinePage.duePill("Call the landlord")).toHaveCount(0);
	});

	test("today's note lists what's due today elsewhere, and tomorrow", async ({
		daySwitcher,
		dueDateMenu,
		outlinePage,
	}) => {
		await outlinePage.addNode("Call the landlord");
		await dueDateMenu.open(outlinePage.row("Call the landlord"));
		await dueDateMenu.item("Today").click();
		await outlinePage.addNode("Update the bank");
		await dueDateMenu.open(outlinePage.row("Update the bank"));
		await dueDateMenu.item("Tomorrow").click();

		await daySwitcher.openToday();
		await expect(outlinePage.title).toHaveText("Today");
		// Already on the page, so not repeated under "elsewhere".
		await outlinePage.addNode("Water the plants");
		await dueDateMenu.open(outlinePage.row("Water the plants"));
		await dueDateMenu.item("Today").click();

		const dueToday = outlinePage.dueGroup("Due today, elsewhere");
		await expect(dueToday).toContainText("Call the landlord");
		await expect(dueToday).not.toContainText("Water the plants");
		await expect(outlinePage.dueGroup("Tomorrow")).toContainText(
			"Update the bank",
		);
	});

	test("picking a calendar day sets it and closes the menu", async ({
		dueDateMenu,
		outlinePage,
		page,
	}) => {
		await outlinePage.addNode("Cancel the storage unit");
		await dueDateMenu.open(outlinePage.row("Cancel the storage unit"));

		await dueDateMenu.day("September 30").click();

		await expect(page.getByRole("menu")).toHaveCount(0);
		await expect(outlinePage.duePill("Cancel the storage unit")).toHaveText(
			"Sep 30",
		);
	});

	test("the calendar keeps its keys inside the menu", async ({
		dueDateMenu,
		outlinePage,
		page,
	}) => {
		await outlinePage.addNode("Book the movers");
		await dueDateMenu.open(outlinePage.row("Book the movers"));
		await dueDateMenu.day("September 27").focus();

		// Arrows move through days; "t" would jump to the Today item if it leaked.
		await page.keyboard.press("ArrowRight");
		await page.keyboard.press("ArrowUp");
		await page.keyboard.press("t");
		await expect(dueDateMenu.day("September 21")).toBeFocused();
		await page.keyboard.press("Enter");

		await expect(outlinePage.duePill("Book the movers")).toHaveText("Sep 21");
	});
});
