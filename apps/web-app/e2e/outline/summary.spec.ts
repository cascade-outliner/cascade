import { expect, test } from "../fixtures.ts";
import type { ContextMenu } from "../pages/context-menu.ts";
import type { OutlinePage } from "../pages/outline-page.ts";

async function zoomIntoLaunch(
	outlinePage: OutlinePage,
	contextMenu: ContextMenu,
) {
	await outlinePage.addNode("Q4 launch");
	await contextMenu.open(outlinePage.row("Q4 launch"));
	await contextMenu.item("Zoom in").click();
	await expect(outlinePage.title).toHaveText("Q4 launch");
	await outlinePage.addNode("Standup notes");
	await outlinePage.addNode("Launch checklist");
	await expect(outlinePage.rows).toHaveCount(2);
}

test.describe("AI off", () => {
	test("a zoomed branch offers no summary", async ({
		contextMenu,
		outlinePage,
		summary,
	}) => {
		await outlinePage.goto();
		await zoomIntoLaunch(outlinePage, contextMenu);

		await expect(summary.trigger).toHaveCount(0);
	});
});

test.describe("AI on", () => {
	test.beforeEach(async ({ outlinePage, splitApi, summary }) => {
		await splitApi.enable();
		await summary.respond([
			{ text: "Beta invites go out tomorrow.", sources: [1] },
			{ text: "The changelog is in progress.", sources: [2] },
		]);
		await outlinePage.goto();
	});

	test("the top-level outline offers no summary", async ({
		outlinePage,
		summary,
	}) => {
		await outlinePage.addNode("Q4 launch");

		await expect(summary.trigger).toHaveCount(0);
	});

	test("pins a summary that survives a reload", async ({
		contextMenu,
		outlinePage,
		page,
		summary,
	}) => {
		await zoomIntoLaunch(outlinePage, contextMenu);

		await summary.trigger.click();
		await expect(summary.card).toHaveAttribute("data-state", "ready");
		await expect(summary.text).toHaveText(
			"Beta invites go out tomorrow.1 The changelog is in progress.2",
		);
		await summary.action("Pin to page").click();
		await expect(summary.card).toHaveAttribute("data-state", "pinned");

		await expect.poll(() => outlinePage.isSaved("Launch checklist")).toBe(true);
		await page.reload();

		await expect(summary.card).toHaveAttribute("data-state", "pinned");
		await expect(summary.text).toContainText("Beta invites go out tomorrow.");
	});

	test("a pinned summary goes out of date when the branch changes", async ({
		contextMenu,
		outlinePage,
		summary,
	}) => {
		await zoomIntoLaunch(outlinePage, contextMenu);
		await summary.trigger.click();
		await summary.action("Pin to page").click();
		await expect(summary.card).toHaveAttribute("data-state", "pinned");

		await outlinePage.addNode("Press list");

		await expect(summary.card).toHaveAttribute("data-state", "stale");
		await expect(summary.card).toContainText("Out of date");

		await summary.action("Refresh").click();
		await summary.action("Pin to page").click();
		await expect(summary.card).toHaveAttribute("data-state", "pinned");
	});

	test("discarding a draft leaves nothing pinned", async ({
		contextMenu,
		outlinePage,
		summary,
	}) => {
		await zoomIntoLaunch(outlinePage, contextMenu);
		await summary.trigger.click();
		await expect(summary.card).toHaveAttribute("data-state", "ready");

		await summary.action("Discard").click();

		await expect(summary.card).toHaveCount(0);
		await expect(summary.trigger).toBeVisible();
	});

	test("a source zooms into the branch it cites", async ({
		contextMenu,
		outlinePage,
		summary,
	}) => {
		await zoomIntoLaunch(outlinePage, contextMenu);
		await summary.trigger.click();

		await summary.source("Launch checklist").click();

		await expect(outlinePage.title).toHaveText("Launch checklist");
	});

	test("status mode groups items by where they stand", async ({
		contextMenu,
		outlinePage,
		summary,
	}) => {
		await summary.respond([
			{ text: "Pricing copy", sources: [1], status: "done" },
			{ text: "Press list", sources: [2], status: "blocked" },
		]);
		await zoomIntoLaunch(outlinePage, contextMenu);
		await summary.trigger.click();

		await summary.action("Status").click();

		await expect(summary.text).toContainText("Done");
		await expect(summary.text).toContainText("Blocked");
		await expect(summary.text).not.toContainText("In progress");
	});
});
