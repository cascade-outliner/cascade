import type { Locator, Page } from "@playwright/test";

/** The outliner row's right-click menu: convert, duplicate, indent, zoom, delete. */
export class ContextMenu {
	constructor(readonly page: Page) {}

	/** Right-clicks `row` to open its context menu. */
	async open(row: Locator) {
		await row.click({ button: "right" });
	}

	/**
	 * Closes the menu, e.g. after a "Convert into" pick, which leaves it open.
	 * Clicks outside rather than pressing Escape: a mouse pick doesn't focus
	 * the menu, so Escape has nothing to close.
	 */
	async close() {
		await this.page.mouse.click(4, 4);
	}

	/** A top-level item or submenu trigger, by its accessible name. */
	item(name: string): Locator {
		return this.page.getByRole("menuitem", { name, exact: true });
	}

	/** A "Convert into" option: a radio item, not a plain menuitem. */
	radioItem(name: string): Locator {
		return this.page.getByRole("menuitemradio", { name, exact: true });
	}

	/** Opens the "Convert into" submenu and returns it, positioned for `.item()`. */
	async convertInto(): Promise<void> {
		await this.item("Convert into").click();
	}

	/** Opens the "Duplicate" submenu. */
	async duplicate(): Promise<void> {
		await this.item("Duplicate").click();
	}
}
