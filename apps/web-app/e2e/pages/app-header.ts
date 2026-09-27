import type { Locator, Page } from "@playwright/test";

/** The bar across the top of every outline page: logo, breadcrumbs, day switcher, search. */
export class AppHeader {
	readonly container: Locator;
	readonly searchButton: Locator;

	constructor(readonly page: Page) {
		this.container = page.getByRole("banner");
		this.searchButton = this.container.getByRole("button", { name: "Search" });
	}
}
