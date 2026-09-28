import { expect, test } from "../fixtures.ts";
import type { OutlinePage } from "../pages/outline-page.ts";

test.beforeEach(async ({ outlinePage }) => {
	await outlinePage.goto();
});

test.describe("convert into", () => {
	test("Task adds a checkbox, Text removes it", async ({
		contextMenu,
		outlinePage,
	}) => {
		await outlinePage.addNode("Water the plants");
		const row = outlinePage.row("Water the plants");

		// The task marker is a read-only checkbox, unexposed to the a11y tree in
		// Chromium: queried by its input type, not its (absent) role.
		const marker = row.locator('input[type="checkbox"]');

		await contextMenu.open(row);
		await contextMenu.convertInto();
		await contextMenu.radioItem("Task").click();
		// Picking a "Convert into" option, unlike a plain item, leaves the menu open.
		await contextMenu.close();

		await expect(marker).toBeVisible();
		await expect(marker).not.toBeChecked();

		await contextMenu.open(row);
		await contextMenu.convertInto();
		await contextMenu.radioItem("Text").click();

		await expect(marker).toHaveCount(0);
	});
});

test.describe("duplicate", () => {
	test("Duplicate selected adds a copy right after it", async ({
		contextMenu,
		outlinePage,
	}) => {
		await outlinePage.addNode("Buy milk");
		await outlinePage.addNode("Buy eggs");

		await contextMenu.open(outlinePage.row("Buy milk"));
		await contextMenu.duplicate();
		await contextMenu.item("Duplicate selected").click();

		await expect(outlinePage.rows).toHaveText([
			"Buy milk",
			"Buy milk",
			"Buy eggs",
		]);
	});

	test("Duplicate with children copies the nested node too", async ({
		contextMenu,
		outlinePage,
	}) => {
		await outlinePage.addNode("Move out");
		await outlinePage.addNode("Call the landlord");
		// Nests "Call the landlord" under "Move out" via the menu's own Indent.
		await contextMenu.open(outlinePage.row("Call the landlord"));
		await contextMenu.item("Indent").click();

		await contextMenu.open(outlinePage.row("Move out"));
		await contextMenu.duplicate();
		await contextMenu.item("Duplicate with children").click();

		await expect(outlinePage.rows).toHaveText([
			"Move out",
			"Call the landlord",
			"Move out",
			"Call the landlord",
		]);
	});

	test("Duplicate with children is disabled on a childless node", async ({
		contextMenu,
		outlinePage,
	}) => {
		await outlinePage.addNode("Lonely node");

		await contextMenu.open(outlinePage.row("Lonely node"));
		await contextMenu.duplicate();

		await expect(contextMenu.item("Duplicate with children")).toBeDisabled();
	});
});

test.describe("indent and outdent", () => {
	test("Indent nests under the previous sibling, Outdent undoes it", async ({
		contextMenu,
		outlinePage,
	}) => {
		await outlinePage.addNode("Move out");
		await outlinePage.addNode("Call the landlord");
		const text = outlinePage
			.row("Call the landlord")
			.getByText("Call the landlord", { exact: true });
		const parentX = (
			await outlinePage
				.row("Move out")
				.getByText("Move out", { exact: true })
				.boundingBox()
		)?.x;
		const beforeX = (await text.boundingBox())?.x;
		expect(beforeX).toBe(parentX);

		await contextMenu.open(outlinePage.row("Call the landlord"));
		await contextMenu.item("Indent").click();

		const indentedX = (await text.boundingBox())?.x;
		expect(indentedX).toBeGreaterThan(beforeX ?? 0);

		await contextMenu.open(outlinePage.row("Call the landlord"));
		await contextMenu.item("Outdent").click();

		const outdentedX = (await text.boundingBox())?.x;
		expect(outdentedX).toBe(beforeX);
	});

	test("Indent is disabled on the first row, Outdent on a top-level one", async ({
		contextMenu,
		outlinePage,
	}) => {
		await outlinePage.addNode("Only node");

		await contextMenu.open(outlinePage.row("Only node"));

		await expect(contextMenu.item("Indent")).toBeDisabled();
		await expect(contextMenu.item("Outdent")).toBeDisabled();
	});
});

test.describe("zoom in", () => {
	test("opens the node as its own page", async ({
		contextMenu,
		outlinePage,
		page,
	}) => {
		await outlinePage.addNode("Plan the trip");

		await contextMenu.open(outlinePage.row("Plan the trip"));
		await contextMenu.item("Zoom in").click();

		await expect(page).toHaveURL(/\/node\/[^/]+$/);
		await expect(outlinePage.title).toHaveText("Plan the trip");
	});
});

test.describe("copy link", () => {
	test("copies a link to the node", async ({
		context,
		contextMenu,
		outlinePage,
		page,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await outlinePage.addNode("Plan the trip");

		await contextMenu.open(outlinePage.row("Plan the trip"));
		await contextMenu.item("Copy link").click();

		const copied = await page.evaluate(() => navigator.clipboard.readText());
		await expect(outlinePage.row("Plan the trip")).toBeVisible();
		expect(copied).toMatch(/\/node\/[^/]+$/);
	});
});

test.describe("delete", () => {
	test("removes the node", async ({ contextMenu, outlinePage }) => {
		await outlinePage.addNode("Buy milk");
		await outlinePage.addNode("Buy eggs");

		await contextMenu.open(outlinePage.row("Buy milk"));
		await contextMenu.item("Delete").click();

		await expect(outlinePage.rows).toHaveText(["Buy eggs"]);
	});
});

test.describe("multi-select", () => {
	/** Drags a marquee box over both rows to select them. */
	async function marqueeSelect(outlinePage: OutlinePage) {
		const first = await outlinePage.row("Buy milk").boundingBox();
		const second = await outlinePage.row("Buy eggs").boundingBox();
		if (!first || !second) throw new Error("rows not found");
		await outlinePage.page.mouse.move(first.x - 20, first.y - 5);
		await outlinePage.page.mouse.down();
		await outlinePage.page.mouse.move(
			second.x + second.width,
			second.y + second.height,
			{ steps: 5 },
		);
		await outlinePage.page.mouse.up();
	}

	test("acts on every selected row", async ({ contextMenu, outlinePage }) => {
		await outlinePage.addNode("Buy milk");
		await outlinePage.addNode("Buy eggs");

		await marqueeSelect(outlinePage);
		await contextMenu.open(outlinePage.row("Buy milk"));
		await expect(contextMenu.item("Delete 2 nodes")).toBeVisible();
		await contextMenu.item("Delete 2 nodes").click();

		await expect(outlinePage.rows).toHaveCount(0);
	});
});
