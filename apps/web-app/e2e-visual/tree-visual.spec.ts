import { cancelDrag, startDragBefore } from "./support/drag";
import { expect, test } from "./support/fixtures";
import { buildVisualScene, destroyVisualScene } from "./support/scene";
import { applyTheme, visualThemes } from "./support/theme";

/**
 * Screenshot-diff coverage for #596: the tree/editor states most often
 * touched by purely visual PRs (see #526-532, #588-590) — a default row, the
 * hover/focus dot, an emoji icon, tag pills, and a drag-in-progress row —
 * across both built-in Cascade themes and one non-Cascade theme (Nord).
 *
 * Baselines live in e2e-visual/__screenshots__ and are checked in. To update
 * them after an intentional visual change:
 *
 *   cd apps/web-app && pnpm exec playwright test --config=playwright.visual.config.ts --update-snapshots
 *
 * then review the diff of the updated PNGs before committing — a snapshot
 * update should always be reviewed like any other change, not applied blind.
 */

for (const theme of visualThemes) {
	test.describe(`theme: ${theme}`, () => {
		test(`default tree rows (${theme})`, async ({ page, orpcClient }) => {
			const scene = await buildVisualScene(orpcClient, `default-${theme}`);
			try {
				await page.goto(`/${scene.rootSlug}`);
				await applyTheme(page, orpcClient, theme);
				const tree = page.getByRole("tree");
				await expect(tree).toBeVisible();
				await expect(page.getByText("Row with an emoji icon")).toBeVisible();
				await expect(tree).toHaveScreenshot(`tree-default-${theme}.png`);
			} finally {
				await destroyVisualScene(orpcClient, scene);
			}
		});

		test(`row hover state (${theme})`, async ({ page, orpcClient }) => {
			const scene = await buildVisualScene(orpcClient, `hover-${theme}`);
			try {
				await page.goto(`/${scene.rootSlug}`);
				await applyTheme(page, orpcClient, theme);
				const row = page.locator(`[data-node-id="${scene.plainId}"]`);
				await row.hover();
				await expect(row).toHaveScreenshot(`row-hover-${theme}.png`);
			} finally {
				await destroyVisualScene(orpcClient, scene);
			}
		});

		test(`row drag state (${theme})`, async ({ page, orpcClient }) => {
			const scene = await buildVisualScene(orpcClient, `drag-${theme}`);
			try {
				await page.goto(`/${scene.rootSlug}`);
				await applyTheme(page, orpcClient, theme);
				await startDragBefore(page, scene.taskDoneId, scene.plainId);
				const tree = page.getByRole("tree");
				await expect(tree).toHaveScreenshot(`tree-drag-${theme}.png`);
				await cancelDrag(page);
			} finally {
				await destroyVisualScene(orpcClient, scene);
			}
		});
	});
}
