import {
	isDarkTheme,
	type ThemeId,
	themeAttribute,
} from "@cascade/theme/themes";
import type { Page } from "@playwright/test";
import type { OrpcClient } from "./orpc-client";

/**
 * The three themes screenshotted by the visual suite: both built-in Cascade
 * palettes plus one non-Cascade theme (Nord), per #596's acceptance
 * criteria ("ideally one non-Cascade theme too") — Nord's variable-heavy
 * palette is the one most likely to expose a component that's still
 * hardcoding a Cascade-specific color instead of a theme variable.
 */
export const visualThemes: readonly ThemeId[] = ["light", "dark", "nord"];

/**
 * Sets the account's theme (bypassing the Settings UI, like
 * `orpcClient.settings.update` elsewhere in the e2e suite) and reloads so the
 * theme is applied SSR — matching what a real page load looks like, rather
 * than the brief flash of the previous theme a client-side-only apply would
 * show.
 */
export async function applyTheme(
	page: Page,
	orpcClient: OrpcClient,
	theme: ThemeId,
): Promise<void> {
	await orpcClient.settings.update({ theme });
	await page.reload();
	await page.waitForFunction(
		([expectedAttribute, expectedDark]) => {
			const root = document.documentElement;
			return (
				(root.dataset.theme ?? null) === expectedAttribute &&
				root.classList.contains("dark") === expectedDark
			);
		},
		[themeAttribute(theme) ?? null, isDarkTheme(theme)] as const,
	);
	// Fonts load asynchronously; wait for them so screenshots don't race a
	// fallback-font layout against the real one.
	await page.evaluate(() => document.fonts.ready);
}
