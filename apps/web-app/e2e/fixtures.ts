import { test as base } from "@playwright/test";
import { AppHeader } from "./pages/app-header.ts";
import { CommandPalette } from "./pages/command-palette.ts";
import { DaySwitcher } from "./pages/day-switcher.ts";
import { DueDateMenu } from "./pages/due-date-menu.ts";
import { OnboardingPage } from "./pages/onboarding-page.ts";
import { OutlinePage } from "./pages/outline-page.ts";

interface Options {
	/** Skip onboarding by marking it finished before the app boots. Default `true`. */
	onboarded: boolean;
}

interface Fixtures {
	appHeader: AppHeader;
	commandPalette: CommandPalette;
	daySwitcher: DaySwitcher;
	dueDateMenu: DueDateMenu;
	onboardingPage: OnboardingPage;
	outlinePage: OutlinePage;
}

/**
 * Each test gets a fresh browser context, so IndexedDB starts empty.
 * Add page objects here as fixtures; override options per file with `test.use()`.
 */
export const test = base.extend<Options & Fixtures>({
	onboarded: [true, { option: true }],
	page: async ({ page, onboarded }, use) => {
		if (onboarded) {
			await page.addInitScript(() => {
				localStorage.setItem(
					"cascade:onboarding",
					JSON.stringify({ template: "blank" }),
				);
			});
		}
		await use(page);
	},
	appHeader: async ({ page }, use) => {
		await use(new AppHeader(page));
	},
	commandPalette: async ({ page }, use) => {
		await use(new CommandPalette(page));
	},
	daySwitcher: async ({ page }, use) => {
		await use(new DaySwitcher(page));
	},
	dueDateMenu: async ({ page }, use) => {
		await use(new DueDateMenu(page));
	},
	onboardingPage: async ({ page }, use) => {
		await use(new OnboardingPage(page));
	},
	outlinePage: async ({ page }, use) => {
		await use(new OutlinePage(page));
	},
});

export { expect } from "@playwright/test";
