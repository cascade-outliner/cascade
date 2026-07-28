import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";

/**
 * Selecting an option closes its dropdown, but the closed popup's options
 * stay in the DOM (zero-sized, `pointer-events: none`) during Base UI's exit
 * transition — harmless for a real click, but `getByRole` can still resolve
 * an option name to that stale copy instead of the one in a later dropdown
 * that happens to share a label (e.g. "Nord" or "Catppuccin Latte" appearing
 * in both the full theme list and the light/dark sub-pickers). Filtering to
 * `:visible` disambiguates which element we mean.
 *
 * The `force: true` sidesteps a Playwright actionability quirk specific to
 * this scenario: a Select popup mounted for the first time immediately after
 * another Select's popup closes (as happens here, since picking "system"
 * synchronously reveals the light/dark sub-pickers) is confirmed — via a raw
 * mouse click at its measured coordinates, and `elementFromPoint` — to be
 * genuinely visible, stable and clickable in the browser; Playwright's own
 * visibility polling nonetheless never resolves for it. A real user's click
 * lands fine; only Playwright's actionability check disagrees.
 */
function visibleOption(page: Page, name: string) {
	return page.getByRole("option", { name }).and(page.locator(":visible"));
}

/**
 * The "Light theme"/"Dark theme" triggers are mounted for the first time the
 * moment "Sync with system" is picked — synchronously, while the "Theme"
 * select's own popup is still mid-exit (150ms transition, see
 * `packages/ui/src/select.tsx`). That's the same "genuinely clickable but
 * Playwright's actionability polling never resolves" quirk `visibleOption`
 * works around above, just on the trigger instead of an option, and it's
 * the suspected cause of #494 (this test hanging until the 30s test timeout
 * on CI, unlike the sibling test that never opens a freshly-mounted select
 * this way). Same fix: `force: true`.
 */
function trigger(page: Page, name: string) {
	return page.getByRole("combobox", { name });
}

/**
 * If the `try` block above already failed (e.g. timed out), Playwright tears
 * down the browser context before `finally` runs, so a restore call needing
 * `context.cookies()` (`support/orpc-client.ts`) throws. An error thrown
 * from `finally` replaces whatever error the `try` block raised, so the real
 * failure gets reported as this unrelated cookie-lookup error instead —
 * exactly the confusing "secondary artifact" #494 was about. Swallow
 * restore failures here so the original error, if any, stays visible; a
 * passing run always restores fine.
 */
async function restoreSettings(restore: () => Promise<unknown>): Promise<void> {
	try {
		await restore();
	} catch (error) {
		console.warn("Failed to restore settings during test cleanup:", error);
	}
}

// Both tests below read and write the shared e2e account's one settings row,
// so they must not run concurrently with each other.
test.describe.configure({ mode: "serial" });

test("syncing with system lets you pick which light and dark theme to use, and follows the OS preference", async ({
	page,
	orpcClient,
}) => {
	const before = await orpcClient.settings.get();
	const restoreTheme = before.theme ?? "light";
	const restoreLightTheme = before.lightTheme;
	const restoreDarkTheme = before.darkTheme;

	try {
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto("/");
		await page.getByRole("button", { name: "User menu" }).click();
		await page.getByRole("menuitem", { name: "Settings" }).click();
		await page.getByRole("combobox", { name: "Theme", exact: true }).click();
		await visibleOption(page, "Sync with system").click({ force: true });

		// Picking "system" reveals the light/dark sub-choices.
		await trigger(page, "Light theme").click({ force: true });
		await visibleOption(page, "Catppuccin Latte").click({ force: true });
		await trigger(page, "Dark theme").click({ force: true });
		await visibleOption(page, "Nord").click({ force: true });

		// It already followed the (light) OS preference before saving.
		await expect(page.locator("html")).toHaveAttribute(
			"data-theme",
			"catppuccin-latte",
		);
		await expect(page.locator("html")).not.toHaveClass(/dark/);

		await page.getByRole("button", { name: "Close settings" }).click();
		await expect
			.poll(async () => (await orpcClient.settings.get()).theme)
			.toBe("system");

		// A reload with no local state still resolves via the SSR blocking
		// script, using the OS preference at load time.
		await page.reload();
		await expect(page.locator("html")).toHaveAttribute(
			"data-theme",
			"catppuccin-latte",
		);
		await expect(page.locator("html")).not.toHaveClass(/dark/);

		// Switching the OS preference live re-resolves without a reload.
		await page.emulateMedia({ colorScheme: "dark" });
		await expect(page.locator("html")).toHaveAttribute("data-theme", "nord");
		await expect(page.locator("html")).toHaveClass(/dark/);

		// And a fresh load under the dark OS preference resolves server-side too.
		await page.reload();
		await expect(page.locator("html")).toHaveAttribute("data-theme", "nord");
		await expect(page.locator("html")).toHaveClass(/dark/);
	} finally {
		await restoreSettings(() =>
			orpcClient.settings.update({
				theme: restoreTheme,
				...(restoreLightTheme ? { lightTheme: restoreLightTheme } : {}),
				...(restoreDarkTheme ? { darkTheme: restoreDarkTheme } : {}),
			}),
		);
	}
});

test("theme choice persists to the account and applies on a device with no local state", async ({
	page,
	orpcClient,
}) => {
	const before = await orpcClient.settings.get();
	const restoreTheme = before.theme ?? "light";
	const target = restoreTheme === "dracula" ? "nord" : "dracula";
	const targetLabel = target === "dracula" ? "Dracula" : "Nord";

	try {
		await page.goto("/");
		await page.getByRole("button", { name: "User menu" }).click();
		await page.getByRole("menuitem", { name: "Settings" }).click();
		await page.getByRole("combobox", { name: "Theme", exact: true }).click();
		await visibleOption(page, targetLabel).click({ force: true });

		// The theme applies immediately, before it is even saved.
		await expect(page.locator("html")).toHaveAttribute("data-theme", target);

		// Closing the dialog is what saves the changes to the account.
		await page.getByRole("button", { name: "Close settings" }).click();

		// The change lands server-side, not just in this tab.
		await expect
			.poll(async () => (await orpcClient.settings.get()).theme)
			.toBe(target);

		// A reload gets the setting from the account (SSR'd, no local state).
		await page.reload();
		await expect(page.locator("html")).toHaveAttribute("data-theme", target);
		// Both candidate themes are dark, so the `dark` class must be SSR'd too.
		await expect
			.poll(() =>
				page.evaluate(() =>
					document.documentElement.classList.contains("dark"),
				),
			)
			.toBe(true);
	} finally {
		// Settings are user-wide state on the shared e2e user; put it back.
		await restoreSettings(() =>
			orpcClient.settings.update({ theme: restoreTheme }),
		);
	}
});
