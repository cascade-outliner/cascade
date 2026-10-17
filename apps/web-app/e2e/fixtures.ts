import { test as base, expect } from "@playwright/test";
import { AppHeader } from "./pages/app-header.ts";
import { CommandPalette } from "./pages/command-palette.ts";
import { ContextMenu } from "./pages/context-menu.ts";
import { DaySwitcher } from "./pages/day-switcher.ts";
import { DueDateMenu } from "./pages/due-date-menu.ts";
import { OnboardingPage } from "./pages/onboarding-page.ts";
import { OutlinePage } from "./pages/outline-page.ts";
import { SlashMenu } from "./pages/slash-menu.ts";
import { SplitApi } from "./pages/split-api.ts";
import { Summary } from "./pages/summary.ts";

interface Options {
	/** Run through onboarding before the test starts. Default `true`. */
	onboarded: boolean;
}

interface Fixtures {
	appHeader: AppHeader;
	commandPalette: CommandPalette;
	contextMenu: ContextMenu;
	daySwitcher: DaySwitcher;
	dueDateMenu: DueDateMenu;
	onboardingPage: OnboardingPage;
	outlinePage: OutlinePage;
	splitApi: SplitApi;
	slashMenu: SlashMenu;
	summary: Summary;
}

/**
 * Each test gets a fresh browser context, so IndexedDB starts empty.
 * Add page objects here as fixtures; override options per file with `test.use()`.
 */
export const test = base.extend<Options & Fixtures>({
	onboarded: [true, { option: true }],
	page: async ({ page, onboarded }, use) => {
		if (onboarded) {
			await page.goto("/");
			await new OnboardingPage(page).complete();
			await expect(page.getByTestId("onboarding")).toBeHidden();
		}
		await use(page);
	},
	appHeader: async ({ page }, use) => {
		await use(new AppHeader(page));
	},
	commandPalette: async ({ page }, use) => {
		await use(new CommandPalette(page));
	},
	contextMenu: async ({ page }, use) => {
		await use(new ContextMenu(page));
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
	splitApi: async ({ page }, use) => {
		await use(new SplitApi(page));
	},
	slashMenu: async ({ page }, use) => {
		await use(new SlashMenu(page));
	},
	summary: async ({ page }, use) => {
		await use(new Summary(page));
	},
});

export { expect };
