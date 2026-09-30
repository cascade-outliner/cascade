import { expect, test } from "../fixtures.ts";

test.describe("links", () => {
	test.beforeEach(async ({ outlinePage }) => {
		await outlinePage.goto();
		await outlinePage.addNode("Docs");
	});

	test("a typed url becomes a link with an open button", async ({
		outlinePage,
		links,
	}) => {
		const row = outlinePage.row("Docs");
		await links.editor(row).click();
		await links.editor(row).press("End");
		await links.editor(row).pressSequentially(" https://example.com/a ");

		await expect(links.anchors(row)).toHaveAttribute(
			"href",
			"https://example.com/a",
		);
		await expect(links.openButtons(row)).toHaveCount(1);
	});

	test("the open button opens the url in a new tab", async ({
		page,
		outlinePage,
		links,
	}) => {
		const row = outlinePage.row("Docs");
		await links.editor(row).click();
		await links.editor(row).press("End");
		await links.editor(row).pressSequentially(" https://example.com/a ");
		await page
			.context()
			.route("https://example.com/**", (route) =>
				route.fulfill({ body: "ok", contentType: "text/html" }),
			);

		const popup = page.waitForEvent("popup");
		await links.openButtons(row).click();
		expect((await popup).url()).toBe("https://example.com/a");
	});

	test("a plain click on a link keeps editing, ctrl+click opens", async ({
		page,
		outlinePage,
		links,
	}) => {
		const row = outlinePage.row("Docs");
		await links.editor(row).click();
		await links.editor(row).press("End");
		await links.editor(row).pressSequentially(" https://example.com/a ");
		await page
			.context()
			.route("https://example.com/**", (route) =>
				route.fulfill({ body: "ok", contentType: "text/html" }),
			);

		await links.anchors(row).click();
		await expect(links.editor(row)).toBeFocused();

		const popup = page.waitForEvent("popup");
		await links.anchors(row).click({ modifiers: ["ControlOrMeta"] });
		expect((await popup).url()).toBe("https://example.com/a");
	});

	test("pasting a url over selected text links it", async ({
		page,
		outlinePage,
		links,
	}) => {
		const row = outlinePage.row("Docs");
		await links.editor(row).click();
		await links.editor(row).press("Control+a");
		await page.evaluate(() => {
			const data = new DataTransfer();
			data.setData("text/plain", "https://example.com/p");
			document.activeElement?.dispatchEvent(
				new ClipboardEvent("paste", {
					clipboardData: data,
					bubbles: true,
					cancelable: true,
				}),
			);
		});

		await expect(links.anchors(row)).toHaveText("Docs");
		await expect(links.anchors(row)).toHaveAttribute(
			"href",
			"https://example.com/p",
		);
	});

	test("/link adds a link with custom text", async ({
		outlinePage,
		slashMenu,
		links,
	}) => {
		const row = outlinePage.row("Docs");
		await slashMenu.openIn(row, "link");
		await slashMenu.option("Link").click();
		await expect(links.urlInput).toBeFocused();
		await links.urlInput.fill("example.org");
		await links.textInput.fill("Example");
		await links.submit.click();

		await expect(links.dialog).toBeHidden();
		await expect(links.anchors(row)).toHaveText("Example");
		await expect(links.anchors(row)).toHaveAttribute(
			"href",
			"https://example.org",
		);
		await expect(links.anchors(row)).toHaveAttribute("title", "example.org");
		await expect(links.editor(row)).toHaveText("Docs Example");
	});

	test("/link rejects unsafe urls", async ({
		outlinePage,
		slashMenu,
		links,
	}) => {
		const row = outlinePage.row("Docs");
		await slashMenu.openIn(row, "link");
		await slashMenu.option("Link").click();
		await links.urlInput.fill("javascript:alert(1)");
		await links.submit.click();

		await expect(links.error).toBeVisible();
		await expect(links.anchors(row)).toHaveCount(0);
	});
});
