import type { Locator, Page } from "@playwright/test";

/** The row context menu's "Due date" submenu: quick picks and a calendar. */
export class DueDateMenu {
	readonly calendar: Locator;

	constructor(readonly page: Page) {
		this.calendar = page.getByRole("group", { name: "Calendar" });
	}

	/** Right-clicks `row` and opens the "Due date" submenu. */
	async open(row: Locator) {
		await row.click({ button: "right" });
		await this.page.getByRole("menuitem", { name: "Due date" }).click();
	}

	/** A quick pick: "Today", "Tomorrow", "Next week", "Remove due date". */
	item(name: string): Locator {
		return this.page.getByRole("menuitem", { name, exact: true });
	}

	/** A calendar day, by its long label ("September 30"). */
	day(label: string): Locator {
		// Escaped, and bounded so "September 3" can't match "September 30".
		const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		return this.calendar.getByRole("button", {
			name: new RegExp(`\\b${escaped}\\b`),
		});
	}
}
