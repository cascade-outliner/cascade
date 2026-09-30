import { expect, test } from "../fixtures.ts";

test.describe("AI off", () => {
	test.beforeEach(async ({ outlinePage }) => {
		// No splitApi.enable(): getAiConfig reports AI as unconfigured, as it
		// does in this suite's own server (no ANTHROPIC_API_KEY).
		await outlinePage.goto();
	});

	test("the capture bar and context menu hide the split affordances", async ({
		contextMenu,
		outlinePage,
	}) => {
		await outlinePage.captureInput.fill("Call the landlord and pay the rent");

		await expect(
			outlinePage.page.getByRole("button", { name: /split/i }),
		).toHaveCount(0);

		await outlinePage.addNode("Call the landlord and pay the rent");
		await contextMenu.open(
			outlinePage.row("Call the landlord and pay the rent"),
		);

		await expect(contextMenu.item("Break into steps")).toBeDisabled();
	});
});

test.describe("capture bar", () => {
	test.beforeEach(async ({ outlinePage, splitApi }) => {
		await splitApi.enable();
		await outlinePage.goto();
	});

	test("Backspace keeps the captured line as a single node", async ({
		outlinePage,
		page,
		splitApi,
	}) => {
		await splitApi.respond("Move out", [
			{ text: "Call the landlord", source: "Call the landlord" },
			{
				text: "Send the invoice",
				source: "email Sam the invoice",
				owner: "Sam",
			},
		]);

		await outlinePage.captureInput.fill("Call the landlord and pay the rent");
		// ⌘⇧↵ keeps focus inside the preview, so Backspace reaches its own key handler.
		await outlinePage.captureInput.press("ControlOrMeta+Shift+Enter");

		const section = page.getByRole("region", { name: "Split into tasks" });
		await expect(section).toBeVisible();
		await page.keyboard.press("Backspace");

		await expect(section).toBeHidden();
		await expect(outlinePage.rows).toHaveText([
			"Call the landlord and pay the rent",
		]);
	});

	test("Escape cancels the split and hands the text back to the input", async ({
		outlinePage,
		page,
		splitApi,
	}) => {
		await splitApi.respond("Move out", [
			{ text: "Call the landlord", source: "Call the landlord" },
			{ text: "Pay the rent", source: "pay the rent" },
		]);

		await outlinePage.captureInput.fill("Call the landlord and pay the rent");
		await outlinePage.captureInput.press("ControlOrMeta+Shift+Enter");

		const section = page.getByRole("region", { name: "Split into tasks" });
		await expect(section).toBeVisible();
		await expect(outlinePage.captureInput).toHaveText("");
		await page.keyboard.press("Escape");

		await expect(section).toBeHidden();
		await expect(outlinePage.rows).toHaveCount(0);
		await expect(outlinePage.captureInput).toHaveText(
			"Call the landlord and pay the rent",
		);
		await expect(outlinePage.captureInput).toBeFocused();

		// A second Escape (or a key repeat) must not throw the text away.
		await page.keyboard.press("Escape");
		await expect(outlinePage.captureInput).toHaveText(
			"Call the landlord and pay the rent",
		);
	});

	test("Cancel while splitting hands the text back to the input", async ({
		outlinePage,
		page,
		splitApi,
	}) => {
		await splitApi.hang();

		await outlinePage.captureInput.fill("Call the landlord and pay the rent");
		await outlinePage.captureInput.press("ControlOrMeta+Shift+Enter");

		await expect(page.getByText("Splitting…")).toBeVisible();
		await page.getByTestId("split-cancel").click();

		await expect(page.getByText("Splitting…")).toBeHidden();
		await expect(outlinePage.rows).toHaveCount(0);
		await expect(outlinePage.captureInput).toHaveText(
			"Call the landlord and pay the rent",
		);
		await expect(outlinePage.captureInput).toBeFocused();
	});

	test("accepting splits the line into a titled parent and its tasks", async ({
		outlinePage,
		page,
		splitApi,
	}) => {
		await splitApi.respond("Move out", [
			{ text: "Call the landlord", source: "Call the landlord" },
			{
				text: "Send the invoice",
				source: "email Sam the invoice",
				owner: "Sam",
			},
		]);

		await outlinePage.captureInput.fill(
			"Call the landlord and email Sam the invoice",
		);
		// ⌘⇧↵ keeps focus inside the preview, so Tab reaches its own key handler.
		await outlinePage.captureInput.press("ControlOrMeta+Shift+Enter");

		const section = page.getByRole("region", { name: "Split into tasks" });
		await expect(section.getByRole("button", { name: "Accept" })).toBeVisible();
		await page.keyboard.press("Tab");

		await expect(section).toBeHidden();
		await expect(outlinePage.rows).toHaveText([
			"Move out",
			"Call the landlord",
			"Send the invoice @Sam",
		]);
	});

	test("a line that's already one task can't be split", async ({
		outlinePage,
		page,
		splitApi,
	}) => {
		await splitApi.respond("Call the landlord", [
			{ text: "Call the landlord", source: "Call the landlord" },
		]);

		await outlinePage.captureInput.fill("Call the landlord");
		await page.getByRole("button", { name: /split/i }).click();

		const section = page.getByRole("region", { name: "Split into tasks" });
		await expect(section.getByText(/cannot be split/)).toBeVisible();
		await expect(section.getByRole("button", { name: "Accept" })).toHaveCount(
			0,
		);
	});
});

test.describe("context menu", () => {
	test.beforeEach(async ({ outlinePage, splitApi }) => {
		await splitApi.enable();
		await outlinePage.goto();
		await outlinePage.addNode("Call the landlord and email Sam the invoice");
	});

	test("Break into steps opens a review sheet, Add splits the note", async ({
		contextMenu,
		outlinePage,
		page,
		splitApi,
	}) => {
		await splitApi.respond("Move out", [
			{ text: "Call the landlord", source: "Call the landlord" },
			{
				text: "Send the invoice",
				source: "email Sam the invoice",
				owner: "Sam",
			},
		]);

		await contextMenu.open(
			outlinePage.row("Call the landlord and email Sam the invoice"),
		);
		await contextMenu.item("Break into steps").click();

		const sheet = page.getByRole("dialog");
		await expect(sheet).toHaveAccessibleName("Split into 2 tasks");
		await sheet.getByRole("button", { name: "Add 2 tasks" }).click();

		await expect(sheet).toBeHidden();
		await expect(outlinePage.rows).toHaveText([
			"Move out",
			"Call the landlord",
			"Send the invoice @Sam",
		]);
	});

	test("closing the sheet leaves the note untouched", async ({
		contextMenu,
		outlinePage,
		page,
		splitApi,
	}) => {
		await splitApi.respond("Move out", [
			{ text: "Call the landlord", source: "Call the landlord" },
			{
				text: "Send the invoice",
				source: "email Sam the invoice",
				owner: "Sam",
			},
		]);

		await contextMenu.open(
			outlinePage.row("Call the landlord and email Sam the invoice"),
		);
		await contextMenu.item("Break into steps").click();

		const sheet = page.getByRole("dialog");
		await expect(sheet).toBeVisible();
		await sheet.getByRole("button", { name: "Close" }).click();

		await expect(sheet).toBeHidden();
		await expect(outlinePage.rows).toHaveText([
			"Call the landlord and email Sam the invoice",
		]);
	});
});
