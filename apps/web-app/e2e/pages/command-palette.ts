import type { Locator, Page } from "@playwright/test";

/** The ⌘K palette: find a node and zoom into it, or create one. */
export class CommandPalette {
	readonly dialog: Locator;
	readonly input: Locator;

	constructor(readonly page: Page) {
		this.dialog = page.getByRole("dialog", { name: "Command palette" });
		this.input = this.dialog.getByRole("combobox", { name: "Search nodes" });
	}

	option(name: string): Locator {
		return this.dialog.getByRole("option", { name });
	}
}
