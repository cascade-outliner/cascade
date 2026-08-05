import { runA11yScan } from "./support/a11y";
import { expect, test } from "./support/fixtures";

// Without this, a scan that happens to run mid-transition (e.g. the
// Settings dialog's panel-swap animation) can catch text at a transient,
// partially-animated opacity and report a color-contrast violation that
// isn't there once the UI settles — flaky rather than a real regression.
// The app already honors `prefers-reduced-motion` (see `dialogPanelMotion`
// in `@cascade/ui/dialog-motion`), so this also doubles as coverage for
// that reduced-motion path.
test.beforeEach(async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
});

function lexicalContent(text: string) {
	return {
		root: {
			type: "root" as const,
			children: [
				{
					type: "paragraph" as const,
					children: [{ type: "text" as const, text }],
				},
			],
		},
	};
}

test("main tree view has no serious/critical accessibility violations", async ({
	page,
	orpcClient,
}, testInfo) => {
	const node = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: node.id,
			content: lexicalContent(`a11y scratch node ${Date.now()}`),
		});

		await page.goto("/");
		await expect(page.getByRole("tree")).toBeVisible();

		await runA11yScan(page, testInfo, "tree-view", {
			include: '[role="tree"]',
		});
	} finally {
		await orpcClient.nodes.delete({ id: node.id });
	}
});

test("Agenda view has no serious/critical accessibility violations", async ({
	page,
	orpcClient,
}, testInfo) => {
	const node = await orpcClient.nodes.create({ parentId: null });

	try {
		await orpcClient.nodes.updateContent({
			id: node.id,
			content: lexicalContent(`a11y agenda scratch node ${Date.now()}`),
		});
		await orpcClient.nodes.setType({
			id: node.id,
			type: "task",
			metadata: { completed: false },
		});
		await orpcClient.nodes.setDueDate({
			id: node.id,
			dueDate: new Date().toISOString().slice(0, 10),
		});

		await page.goto("/agenda");
		await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();

		await runA11yScan(page, testInfo, "agenda-view");
	} finally {
		await orpcClient.nodes.delete({ id: node.id });
	}
});

test("Settings dialog (desktop) has no serious/critical accessibility violations", async ({
	page,
}, testInfo) => {
	await page.goto("/");
	await page.getByRole("button", { name: "User menu" }).click();
	await page.getByRole("menuitem", { name: "Settings" }).click();
	await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
	// Settings persists which tabs were visited across the dialog's lifetime,
	// so opening a second tab exercises more than just the default panel.
	await page.getByRole("tab", { name: "Appearance" }).click();

	await runA11yScan(page, testInfo, "settings-desktop", {
		include: '[role="dialog"]',
	});

	await page.getByRole("button", { name: "Close settings" }).click();
});

test("Settings dialog (mobile full-screen panel) has no serious/critical accessibility violations", async ({
	page,
}, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	await page.getByRole("button", { name: "User menu" }).click();
	await page.getByRole("menuitem", { name: "Settings" }).click();
	await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

	// Below the `sm:` breakpoint, opening the dialog lands on the mobile tab
	// list; scan that first...
	await runA11yScan(page, testInfo, "settings-mobile-tab-list", {
		include: '[role="dialog"]',
	});

	// ...then select a tab, which swaps in the full-screen panel view
	// (`mobilePageOpen`) that's specific to the mobile layout.
	await page.getByRole("button", { name: "Appearance", exact: true }).click();
	await expect(page.getByRole("tabpanel")).toBeVisible();

	await runA11yScan(page, testInfo, "settings-mobile-panel", {
		include: '[role="dialog"]',
	});

	await page.getByRole("button", { name: "Close settings" }).click();
});
