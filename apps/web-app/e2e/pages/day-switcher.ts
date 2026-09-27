import type { Locator, Page } from "@playwright/test";

/** The `‹ Today ›` daily notes switcher at the top of every page. */
export class DaySwitcher {
	readonly container: Locator;
	readonly previousButton: Locator;
	readonly nextButton: Locator;

	constructor(readonly page: Page) {
		this.container = page.getByRole("navigation", { name: "Daily nodes" });
		this.previousButton = this.container.getByRole("button", {
			name: "Previous day",
		});
		this.nextButton = this.container.getByRole("button", { name: "Next day" });
	}

	/** The middle button, named after the day shown: "Today", "Yesterday", "Sep 30"… */
	dayButton(label: string): Locator {
		return this.container.getByRole("button", { name: label, exact: true });
	}

	async openToday() {
		await this.dayButton("Today").click();
	}
}
