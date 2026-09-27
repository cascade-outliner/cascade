import { test as base } from "@playwright/test";
import { OnboardingPage } from "./pages/onboarding-page.ts";
import { OutlinePage } from "./pages/outline-page.ts";

interface Options {
	/** Skip onboarding by marking it finished before the app boots. Default `true`. */
	onboarded: boolean;
}

interface Fixtures {
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
	onboardingPage: async ({ page }, use) => {
		await use(new OnboardingPage(page));
	},
	outlinePage: async ({ page }, use) => {
		await use(new OutlinePage(page));
	},
});

export { expect } from "@playwright/test";
