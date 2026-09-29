import { expect, test } from "../fixtures.ts";

test.describe("slash menu", () => {
	test.beforeEach(async ({ outlinePage }) => {
		await outlinePage.goto();
		await outlinePage.addNode("Buy milk");
	});

	test("typing / lists the commands, first one highlighted", async ({
		outlinePage,
		slashMenu,
	}) => {
		await slashMenu.openIn(outlinePage.row("Buy milk"));

		await expect(slashMenu.menu).toBeVisible();
		await expect(slashMenu.option("Turn into task")).toBeVisible();
		await expect(slashMenu.highlighted).toHaveText(/Turn into task/);
	});

	test("typing after the slash narrows the list", async ({
		outlinePage,
		slashMenu,
	}) => {
		await slashMenu.openIn(outlinePage.row("Buy milk"), "tom");

		await expect(slashMenu.options).toHaveCount(1);
		await expect(slashMenu.option("Due tomorrow")).toBeVisible();
	});

	test("Enter runs the highlighted command and removes the query", async ({
		outlinePage,
		slashMenu,
	}) => {
		const row = outlinePage.row("Buy milk");
		await slashMenu.openIn(row, "task");
		await expect(slashMenu.highlighted).toHaveText(/Turn into task/);
		await slashMenu.editor(row).press("Enter");

		await expect(slashMenu.menu).toBeHidden();
		await expect(row.getByRole("checkbox")).toBeVisible();
		await expect(slashMenu.editor(row)).toHaveText("Buy milk");
	});

	test("clicking a command runs it", async ({ outlinePage, slashMenu }) => {
		await slashMenu.openIn(outlinePage.row("Buy milk"), "tom");
		await slashMenu.option("Due tomorrow").click();

		await expect(outlinePage.duePill("Buy milk")).toHaveText("Tomorrow");
		await expect(slashMenu.editor(outlinePage.row("Buy milk"))).toHaveText(
			"Buy milk",
		);
	});

	test("arrows move the highlight", async ({ outlinePage, slashMenu }) => {
		const row = outlinePage.row("Buy milk");
		await slashMenu.openIn(row, "due");
		await expect(slashMenu.highlighted).toHaveText(/Due today/);
		await slashMenu.editor(row).press("ArrowDown");

		await expect(slashMenu.highlighted).toHaveText(/Due tomorrow/);
	});

	test("Escape closes the menu and keeps the text", async ({
		outlinePage,
		slashMenu,
	}) => {
		const row = outlinePage.row("Buy milk");
		await slashMenu.openIn(row, "ta");
		await expect(slashMenu.option("Turn into task")).toBeVisible();
		await slashMenu.editor(row).press("Escape");

		await expect(slashMenu.menu).toBeHidden();
		await expect(slashMenu.editor(row)).toHaveText("Buy milk /ta");
	});

	test("hides when nothing matches", async ({ outlinePage, slashMenu }) => {
		await slashMenu.openIn(outlinePage.row("Buy milk"), "xyz");

		await expect(slashMenu.menu).toBeHidden();
	});

	test("only offers commands that apply to the node", async ({
		outlinePage,
		slashMenu,
	}) => {
		const row = outlinePage.row("Buy milk");
		await slashMenu.openIn(row, "task");
		await expect(slashMenu.highlighted).toHaveText(/Turn into task/);
		await slashMenu.editor(row).press("Enter");
		await expect(row.getByRole("checkbox")).toBeVisible();

		await slashMenu.openIn(row, "t");

		await expect(slashMenu.option("Turn into text")).toBeVisible();
		await expect(slashMenu.option("Turn into task")).toBeHidden();
	});

	test("the change survives a reload", async ({
		outlinePage,
		slashMenu,
		page,
	}) => {
		const row = outlinePage.row("Buy milk");
		await slashMenu.openIn(row, "today");
		await expect(slashMenu.highlighted).toHaveText(/Due today/);
		await slashMenu.editor(row).press("Enter");
		await expect(outlinePage.duePill("Buy milk")).toHaveText("Today");
		await expect.poll(() => outlinePage.isSaved("Buy milk")).toBe(true);

		await page.reload();

		await expect(outlinePage.duePill("Buy milk")).toHaveText("Today");
		await expect(slashMenu.editor(outlinePage.row("Buy milk"))).toHaveText(
			"Buy milk",
		);
	});
});

test.describe("slash menu in the capture bar", () => {
	test.beforeEach(async ({ outlinePage }) => {
		await outlinePage.goto();
	});

	test("opens on a leading slash", async ({ outlinePage, slashMenu }) => {
		await outlinePage.captureInput.fill("/");

		await expect(slashMenu.menu).toBeVisible();
		await expect(slashMenu.highlighted).toHaveText(/Turn into task/);
	});

	test("a pick becomes a chip and applies when the text is submitted", async ({
		outlinePage,
		slashMenu,
	}) => {
		await outlinePage.captureInput.fill("/task");
		await expect(slashMenu.highlighted).toHaveText(/Turn into task/);
		await outlinePage.captureInput.press("Enter");

		await expect(slashMenu.menu).toBeHidden();
		await expect(outlinePage.captureChips).toHaveText(["Turn into task"]);
		await expect(outlinePage.captureInput).toHaveText("");
		await expect(outlinePage.rows).toHaveCount(0);

		await outlinePage.captureInput.pressSequentially("Buy milk");
		await outlinePage.captureInput.press("Enter");

		await expect(outlinePage.rows).toHaveText(["Buy milk"]);
		await expect(
			outlinePage.row("Buy milk").getByRole("checkbox"),
		).toBeVisible();
		await expect(outlinePage.captureChips).toHaveCount(0);
		await expect(outlinePage.captureInput).toHaveText("");
		await expect(outlinePage.captureInput).toBeFocused();
	});

	test("a slash after the text works too, and picks chain", async ({
		outlinePage,
		slashMenu,
	}) => {
		await outlinePage.captureInput.fill("Call mom /task");
		await expect(slashMenu.highlighted).toHaveText(/Turn into task/);
		await outlinePage.captureInput.press("Enter");
		await outlinePage.captureInput.pressSequentially(" /tom");
		await slashMenu.option("Due tomorrow").click();

		await expect(outlinePage.captureChips).toHaveText([
			"Turn into task",
			"Due tomorrow",
		]);
		await expect(outlinePage.captureInput).toHaveText("Call mom");

		await outlinePage.captureInput.press("Enter");

		await expect(
			outlinePage.row("Call mom").getByRole("checkbox"),
		).toBeVisible();
		await expect(outlinePage.duePill("Call mom")).toHaveText("Tomorrow");
	});

	test("chips go with their × button or Backspace on empty text", async ({
		outlinePage,
		slashMenu,
	}) => {
		await outlinePage.captureInput.fill("/task");
		await expect(slashMenu.highlighted).toHaveText(/Turn into task/);
		await outlinePage.captureInput.press("Enter");
		await outlinePage.captureInput.pressSequentially("/tom");
		await expect(slashMenu.highlighted).toHaveText(/Due tomorrow/);
		await outlinePage.captureInput.press("Enter");
		await expect(outlinePage.captureChips).toHaveCount(2);

		await outlinePage.captureInput.press("Backspace");
		await expect(outlinePage.captureChips).toHaveText(["Turn into task"]);

		await outlinePage.captureChips
			.filter({ hasText: "Turn into task" })
			.getByRole("button", { name: "Remove Turn into task" })
			.click();
		await expect(outlinePage.captureChips).toHaveCount(0);
	});

	test("Escape hides the menu and keeps the text", async ({
		outlinePage,
		slashMenu,
	}) => {
		await outlinePage.captureInput.fill("Buy milk /ta");
		await expect(slashMenu.menu).toBeVisible();
		await outlinePage.captureInput.press("Escape");

		await expect(slashMenu.menu).toBeHidden();
		await expect(outlinePage.captureInput).toHaveText("Buy milk /ta");
	});

	test("only offers the capture commands", async ({
		outlinePage,
		slashMenu,
	}) => {
		await outlinePage.captureInput.fill("/");

		await expect(slashMenu.option("Turn into task")).toBeVisible();
		await expect(slashMenu.option("Delete")).toBeHidden();
		await expect(slashMenu.option("Indent")).toBeHidden();
	});
});
