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
